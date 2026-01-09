from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from exam.models import Educator, Student, Test, Overview, Result, Manager
from django.core.files.storage import default_storage  # ✅ Ensure transactions commit properly

from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
import json
from exam.services.save_students import save_students
from exam.models.test_status import TestProcessingStatus
from exam.models.swot import SWOT
from exam.models.test_metadata import TestMetadata
import logging
import sentry_sdk
import re

logger = logging.getLogger(__name__)


def normalize_subdomain(raw_value):
    """Normalize an institution value into a DNS-safe subdomain slug."""
    if not raw_value:
        return None
    slug = re.sub(r'[^a-z0-9-]', '-', str(raw_value).strip().lower())
    slug = re.sub(r'-+', '-', slug).strip('-')
    return slug or None

UPLOAD_DIR = "uploads/"

# Helper to parse test_num from various formats (e.g., "Test 2" -> 2, "2" -> 2)
def parse_test_num(test_input):
    """Parse test_num from string formats like 'Test 2', 'test 2', '2', etc."""
    if test_input is None:
        return None
    
    # If already an integer, return it
    if isinstance(test_input, int):
        return test_input
    
    # Convert to string and try to extract number
    test_str = str(test_input).strip()
    
    # Try direct integer conversion first
    try:
        return int(test_str)
    except ValueError:
        pass
    
    # Try to extract number from "Test N" or "test N" format
    match = re.search(r'\d+', test_str)
    if match:
        return int(match.group())
    
    # If nothing works, return None
    return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_educator_details(request):
    try:
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()
        
        if not educator:
            # Return empty/default data instead of error for non-educators
            return JsonResponse({'name': '', "class_id": '', "inst": ''}, status=200)
        
        name = educator.name
        class_id = educator.class_id
        inst = educator.institution
        return JsonResponse({
            'name': name,
            'class_id': class_id,
            'inst': inst,
            'institute_subdomain': normalize_subdomain(inst),
        }, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_details(request):
    try:
        # Get logged-in educator's email
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()
        if not educator:
            return Response({"error": "Educator not found"}, status=404)

        # Get class_id and institution from the educator
        class_id = educator.class_id
        institution = educator.institution
        institute_subdomain = normalize_subdomain(institution)

        # Fetch students in the same class
        students = Student.objects.filter(class_id=class_id).values('student_id', 'name', 'dob')
        
        # Add institution to each student's data
        students_with_inst = [
            {**student, 'inst': institution, 'institute_subdomain': institute_subdomain}
            for student in students
        ]

        return Response({"students": students_with_inst}, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def educator_register(request):
    """Handles first-time educator registration and student CSV upload."""
    try:
        logger.info("📥 Incoming Request Data:", request.data)
        #print("📥 Incoming Request Data:", request.data)

        # ✅ Extract educator details
        full_name = request.data.get("name")  
        email = request.data.get("email")
        dob = request.data.get("dob")
        institution = request.data.get("institution")
        password = request.data.get("password")
        phone_number = request.data.get("phone_number")  # Optional for WhatsApp notifications
        whatsapp_opt_in = request.data.get("whatsapp_opt_in", "false").lower() == "true"
        whatsapp_consent_text = request.data.get("whatsapp_consent_text", "")
        whatsapp_consent_ip = request.data.get("whatsapp_consent_ip", "")
        student_csv = request.FILES.get("file")

        # ✅ Validate required fields
        if not all([full_name, email, dob, institution, password, student_csv]):
            return Response({"error": "Missing required fields"}, status=400)

        # ✅ Check if educator exists
        educator = Educator.objects.filter(email=email).first()
        if not educator:
            return Response({"error": "Educator not found"}, status=404)

        # ✅ Prevent duplicate sign-ups
        if educator.csv_status == "started":
            return Response({"error": "CSV upload is already in progress."}, status=403)

        elif educator.csv_status == "completed":
            return Response({"error": "CSV has already been uploaded."}, status=403)

        elif educator.csv_status == "failed":
            return Response({"error": "Previous CSV upload failed. Please retry."}, status=403)

        


        # ✅ Save Educator Password and details
        educator.name = full_name  
        educator.dob = dob
        educator.institution = institution
        educator.password = make_password(password)
        
        # ✅ Save phone number if provided (for WhatsApp notifications)
        if phone_number:
            educator.phone_number = phone_number
        
        # ✅ Save WhatsApp opt-in consent
        if whatsapp_opt_in:
            from django.utils import timezone
            educator.whatsapp_opt_in = True
            educator.whatsapp_opt_in_timestamp = timezone.now()
            educator.whatsapp_consent_ip = whatsapp_consent_ip or request.META.get('REMOTE_ADDR', '')
            educator.whatsapp_consent_text = whatsapp_consent_text
        
        educator.save()

        # ✅ Retrieve class_id
        educator = Educator.objects.filter(email=email).first()
        if not educator or not educator.class_id:
            return Response({"error": "Educator class ID is missing"}, status=400)

        class_id = educator.class_id

        # ✅ Ensure proper folder structure
        # Optional: Slugify to prevent weird characters in folder names
        folder = f"inzighted/uploads/{class_id}/"
        student_detail_path = folder + "stud.csv"

        # ✅ Save CSV file to S3 (or any default storage backend)
        with default_storage.open(student_detail_path, "wb") as destination:
            for chunk in student_csv.chunks():
                destination.write(chunk)

        # ✅ Process Student Data Using Utility Function
        save_students.delay(email, class_id)

        return Response({"message": "Educator registered successfully!"}, status=201)

    except Exception as e:
        logger.exception(f"Error in educator_register: {str(e)}")
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_educator_tests(request):
    """Fetch all tests for a given educator with status from TestProcessingStatus."""
    try:
        educator = None
        if isinstance(request.user, Educator):
            educator = request.user
        elif isinstance(request.user, Manager):
            educator_id = request.GET.get('educator_id') # GET request, so use query params
            if not educator_id:
                return JsonResponse({'error': 'Educator ID is required for institution view'}, status=400)
            educator = Educator.objects.filter(id=educator_id).first()
            if not educator:
                return JsonResponse({'error': 'Educator not found'}, status=404)
            
            if request.user.institution != educator.institution:
                 return JsonResponse({'error': 'Unauthorized: Educator does not belong to your institution'}, status=403)
        else:
             return JsonResponse({'error': 'Unauthorized user type'}, status=403)

        class_id = educator.class_id
        tests = Test.objects.filter(class_id=class_id).order_by('test_num')

        test_data = []
        for test in tests:
            status_entry = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test.test_num).first()
            metadata = TestMetadata.objects.filter(class_id=class_id, test_num=test.test_num).first()
            test_data.append({
                "test_num": test.test_num,
                "test_name": metadata.test_name if metadata else None,
                "date": test.date,
                "status": status_entry.status if status_entry else "PENDING"
            })

        return JsonResponse({'tests': test_data}, status=200)

    except Exception as e:
        logger.exception(f"Error in get_educator_tests: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_educator_test(request, test_num):
    """Update test metadata (currently only test_name)."""
    try:
        educator = None
        if isinstance(request.user, Educator):
            educator = request.user
        elif isinstance(request.user, Manager):
            educator_id = request.data.get('educator_id')
            if not educator_id:
                return JsonResponse({'error': 'Educator ID is required for institution view'}, status=400)
            educator = Educator.objects.filter(id=educator_id).first()
            if not educator:
                return JsonResponse({'error': 'Educator not found'}, status=404)
            
            if request.user.institution != educator.institution:
                return JsonResponse({'error': 'Unauthorized: Educator does not belong to your institution'}, status=403)
        else:
            return JsonResponse({'error': 'Unauthorized user type'}, status=403)

        class_id = educator.class_id
        
        # Get the test to verify it exists
        test = Test.objects.filter(class_id=class_id, test_num=test_num).first()
        if not test:
            return JsonResponse({'error': 'Test not found'}, status=404)

        # Get or create metadata
        metadata, created = TestMetadata.objects.get_or_create(
            class_id=class_id,
            test_num=test_num,
            defaults={
                'pattern': 'PHY_CHEM_BIO',
                'subject_order': ['Physics', 'Chemistry', 'Biology'],
                'total_questions': 180,
            }
        )

        # Update test_name if provided
        test_name = request.data.get('test_name')
        if test_name is not None:
            metadata.test_name = test_name.strip()
            metadata.save()

        return JsonResponse({
            'success': True,
            'message': 'Test updated successfully',
            'test_name': metadata.test_name
        }, status=200)

    except Exception as e:
        logger.exception(f"Error in update_educator_test: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_educator_dashboard(request):

    try:
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()
        
        if not educator:
            return JsonResponse({'error': 'Educator not found'}, status=404)

        class_id = educator.class_id

        records = Overview.objects.filter(user_id=educator_email, class_id=class_id)

        summary_map = {
            'OP': ('Overall Performance', 'ChartLine'),
            'TT': ('Tests Taken', 'ClipboardText'),
            'IR': ('Improvement Rate', 'TrendUp'),
            'CS': ('Consistency Score', 'Archive'),
        }

        summaryCardsData = [
            {
                "title": label,
                "value": f"{r.metric_value}%" if key == 'OP' else r.metric_value,
                "icon": icon
            }
            for r in records
            if (key := r.metric_name) in summary_map
            for label, icon in [summary_map[key]]
        ]

        metric_dict = {r.metric_name: r.metric_value for r in records}
        

        keyInsightsData = {
            "keyStrengths": json.loads(metric_dict.get('KS', '[]')),
            "areasForImprovement": json.loads(metric_dict.get('AI', '[]')),
            "quickRecommendations": json.loads(metric_dict.get('QR', '[]')),
            "yetToDecide": json.loads(metric_dict.get('CV', '[]')),
        }



        # Include compact test metadata mapping for the educator's class
        try:
            metas = TestMetadata.objects.filter(class_id=class_id).order_by('test_num')
            test_metadata_map = {str(m.test_num): {'pattern': m.pattern, 'subject_order': m.subject_order, 'test_name': m.test_name} for m in metas}
        except Exception:
            test_metadata_map = {}

        return Response({
            "summaryCardsData": summaryCardsData,
            "keyInsightsData": keyInsightsData,
            "testMetadata": test_metadata_map
        })
    except Exception as e:
        logger.exception(f"Error in get_educator_dashboard: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_swot_tests(request):
    email = request.user.email
    tests = SWOT.objects.filter(user_id=email).values_list('test_num', flat=True).distinct()
    return Response({"available_tests": list(tests)})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_educator_swot(request):
    try:
        # Get logged-in student ID
        email = request.user.email
        educator = Educator.objects.filter(email=email).first()
        if not educator:
            return Response({"error": "Student not found"}, status=404)

        # Get test_num from the POST data and parse it
        test_num = parse_test_num(request.data.get("test_num"))
        if test_num is None:
            return Response({"error": "Invalid test_num format"}, status=400)
        

        # Filter records using test_num and student/class info
        class_id = educator.class_id
        record = SWOT.objects.filter(
            user_id=email,
            class_id=class_id,
            test_num=test_num,
            swot_parameter="swot"
        ).first()

        if not record:
            return Response({"error": "SWOT record not found"}, status=404)

        return Response({
            "swot": json.loads(record.swot_value)
        })

    except Exception as e:
        logger.exception(f"Error in get_educator_swot: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_educatorstudent_insights(request):
    try:
        # Extract form data from request.data instead of query_params
        student_id = request.data.get("student_id")
        test_num_raw = request.data.get("test_num")
        
        logger.debug(f"[DEBUG] Received request data: student_id={student_id}, test_num={test_num_raw}")
        #print(f"[DEBUG] Received request data: student_id={student_id}, test_num={test_num_raw}")

        if not student_id or test_num_raw is None:
            return Response({"error": "Both 'student_id' and 'test_num' are required."}, status=400)

        # Parse test_num from various formats (e.g., "Test 2" -> 2)
        test_num = parse_test_num(test_num_raw)
        if test_num is None:
            return Response({"error": "Invalid test_num format"}, status=400)

        # Fetch student
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({"error": "Student not found"}, status=404)

        class_id = student.class_id

        # --- SWOT DATA ---
        swot_record = SWOT.objects.filter(
            user_id=student_id,
            class_id=class_id,
            test_num=test_num,
            swot_parameter="swot"
        ).first()

        swot_data = json.loads(swot_record.swot_value) if swot_record else {}

        # --- OVERVIEW DATA ---
        overview_records = Overview.objects.filter(user_id=student_id, class_id=class_id)

        summary_map = {
            'OP': ('Overall Performance', 'ChartLine'),
            'TT': ('Tests Taken', 'ClipboardText'),
            'IR': ('Improvement Rate', 'TrendUp'),
            'CS': ('Consistency Score', 'Archive'),
        }

        summaryCardsData = [
            {
                "title": label,
                "value": f"{r.metric_value}%" if key == 'OP' else r.metric_value,
                "icon": icon
            }
            for r in overview_records
            if (key := r.metric_name) in summary_map
            for label, icon in [summary_map[key]]
        ]
        # --- KEY INSIGHTS DATA (KS, AI, QR, CV) ---
        metric_dict = {r.metric_name: r.metric_value for r in overview_records}

        keyInsightsData = {
            "keyStrengths": json.loads(metric_dict.get('KS', '[]')),
            "areasForImprovement": json.loads(metric_dict.get('AI', '[]')),
            "quickRecommendations": json.loads(metric_dict.get('QR', '[]')),
            "yetToDecide": json.loads(metric_dict.get('CV', '[]')),
        }
        logger.debug(f"[DEBUG] Returning data for student {student_id}, test {test_num}")
        #print(f"[DEBUG] Returning data for student {student_id}, test {test_num}")
        return Response({
            "swot": swot_data,
            "overview": {
                "summaryCardsData": summaryCardsData,
                "keyInsightsData": keyInsightsData,
            }
        })

    except Exception as e:
        logger.exception(f"[ERROR] Exception in get_educatorstudent_insights: {str(e)}")
        #print(f"[ERROR] Exception in get_educatorstudent_insights: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_educator_student_available_swot_tests(request):
    student_id = request.data.get("student_id")
    tests = SWOT.objects.filter(user_id=student_id).values_list('test_num', flat=True).distinct()
    return Response({"available_tests": list(tests)})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_educator_student_tests(request):
    try:
        student_id = request.data.get("student_id")
        logger.debug(f"[DEBUG] Fetching tests for student_id: {student_id}")
        #print(f"[DEBUG] Fetching tests for student_id: {student_id}")

        tests = SWOT.objects.filter(
            user_id=student_id,
            swot_parameter="swot"
        ).values_list('test_num', flat=True).distinct()
        
        tests = SWOT.objects.filter(user_id=student_id).values_list('test_num', flat=True).distinct()
        return Response({"available_tests": list(tests)})

    except Exception as e:
        logger.exception(f"[ERROR] Exception in get_educator_student_tests: {str(e)}")
        #print(f"[ERROR] Exception in get_educator_student_tests: {str(e)}")
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_educator_students_result(request):
    """Fetch all tests for a given educator with status from TestProcessingStatus."""
    try:
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()

        if not educator:
            return JsonResponse({'error': 'Educator not found'}, status=404)

        class_id = educator.class_id
        results = Result.objects.filter(class_id=class_id).order_by('student_id', 'test_num')
        return Response({
            "results": list(results.values(
                'student_id', 'class_id', 'test_num', 'phy_total', 'phy_attended', 
                'phy_correct', 'phy_score', 'chem_total', 'chem_attended', 
                'chem_correct', 'chem_score', 'bot_total', 'bot_attended', 
                'bot_correct', 'bot_score', 'zoo_total', 'zoo_attended', 
                'zoo_correct', 'zoo_score', 'bio_total', 'bio_attended', 
                'bio_correct', 'bio_score', 'total_attended', 
                'total_correct', 'total_score'
            ))
        }, status=200)
    except Exception as e:
        logger.exception(f"Error in get_educator_students_result: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)