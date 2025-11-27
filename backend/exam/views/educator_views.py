from django.contrib.auth.hashers import make_password
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from exam.models import Educator, Student, Test, Overview, Result
from django.core.files.storage import default_storage  # ✅ Ensure transactions commit properly

from django.http import JsonResponse
from rest_framework.permissions import IsAuthenticated
import json
from exam.services.save_students import save_students
from exam.models.test_status import TestProcessingStatus
from exam.models.swot import SWOT
from exam.models.test_metadata import TestMetadata
import logging

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads/"

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_educator_details(request):
    try:

        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()
        name=educator.name
        class_id=educator.class_id
        inst = educator.institution
        return JsonResponse({'name': name, "class_id":class_id, "inst": inst}, status=200)

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

        # Fetch students in the same class
        students = Student.objects.filter(class_id=class_id).values('student_id', 'name', 'dob')
        
        # Add institution to each student's data
        students_with_inst = [
            {**student, 'inst': institution}
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

        


        # ✅ Save Educator Password
        educator.name = full_name  
        educator.dob = dob
        educator.institution = institution
        educator.password = make_password(password)
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
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_educator_tests(request):
    """Fetch all tests for a given educator with status from TestProcessingStatus."""
    try:
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()

        if not educator:
            return JsonResponse({'error': 'Educator not found'}, status=404)

        class_id = educator.class_id
        tests = Test.objects.filter(class_id=class_id).order_by('test_num')

        test_data = []
        for test in tests:
            status_entry = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test.test_num).first()
            test_data.append({
                "test_num": test.test_num,
                "date": test.date,
                "status": status_entry.status if status_entry else "PENDING"
            })

        return JsonResponse({'tests': test_data}, status=200)

    except Exception as e:
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
            test_metadata_map = {str(m.test_num): {'pattern': m.pattern, 'subject_order': m.subject_order} for m in metas}
        except Exception:
            test_metadata_map = {}

        return Response({
            "summaryCardsData": summaryCardsData,
            "keyInsightsData": keyInsightsData,
            "testMetadata": test_metadata_map
        })
    except Exception as e:
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

        # Get test_num from the POST data
        test_num = request.data.get("test_num")
        

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
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_educatorstudent_insights(request):
    try:
        # Extract form data from request.data instead of query_params
        student_id = request.data.get("student_id")
        test_num = request.data.get("test_num")
        
        logger.debug(f"[DEBUG] Received request data: student_id={student_id}, test_num={test_num}")
        #print(f"[DEBUG] Received request data: student_id={student_id}, test_num={test_num}")

        if not student_id or test_num is None:
            return Response({"error": "Both 'student_id' and 'test_num' are required."}, status=400)

        # Convert test_num to integer if it's not already
        try:
            test_num = int(test_num)
        except (ValueError, TypeError):
            return Response({"error": "test_num must be a valid integer"}, status=400)

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
        logger.error(f"[ERROR] Exception in get_educatorstudent_insights: {str(e)}")
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
        logger.error(f"[ERROR] Exception in get_educator_student_tests: {str(e)}")
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
        return JsonResponse({'error': str(e)}, status=500)