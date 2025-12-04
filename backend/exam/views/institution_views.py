"""
Institution Views
Endpoints for institution (manager) to view and manage educators and their students.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from exam.models import Educator, Student, Overview, Result, SWOT, Manager
import json
import logging
import re

from exam.graph_utils.delete_graph import delete_db
from exam.models import StudentResponse, Performance

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution_educators(request):
    """
    Fetch all educators belonging to the institution of the logged-in manager.
    Returns: List of educators with their basic information.
    """
    try:
        # Get the logged-in manager's email
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get institution from manager
        institution = manager.institution
        
        if not institution:
            return Response({"error": "Manager has no assigned institution"}, status=400)
        
        # Fetch all educators belonging to this institution
        educators = Educator.objects.filter(institution=institution).values(
            'id', 'name', 'email', 'class_id', 'institution', 'csv_status'
        )
        
        return Response({"educators": list(educators)}, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_educators: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution_educator_dashboard(request, educator_id):
    """
    Fetch dashboard data for a specific educator (institution view).
    
    Args:
        educator_id: The ID of the educator
        
    Returns: Dashboard summary cards and key insights
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get the educator and verify they belong to the same institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        # Get educator's email and class_id
        educator_email = educator.email
        class_id = educator.class_id
        
        # Fetch overview records for this educator
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
        
        return Response({
            "summaryCardsData": summaryCardsData,
            "keyInsightsData": keyInsightsData,
        })
        
    except Exception as e:
        logger.exception(f"Error in get_institution_educator_dashboard: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution_educator_students_result(request, educator_id):
    """
    Fetch all student results for a specific educator (institution view).
    
    Args:
        educator_id: The ID of the educator
        
    Returns: List of all student results for the educator's class
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get the educator and verify they belong to the same institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        class_id = educator.class_id
        
        # Fetch all results for this class
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
        logger.exception(f"Error in get_institution_educator_students_result: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_institution_educator_swot(request, educator_id):
    """
    Fetch SWOT analysis for a specific educator (institution view).
    
    Args:
        educator_id: The ID of the educator
        
    Request body:
        test_num: The test number for which to fetch SWOT data
        
    Returns: SWOT analysis data
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get the educator and verify they belong to the same institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        # Get test_num from request body
        test_num = request.data.get("test_num")
        
        if test_num is None:
            return Response({"error": "test_num is required"}, status=400)
        
        # Get educator's email and class_id
        educator_email = educator.email
        class_id = educator.class_id
        
        # Fetch SWOT record
        record = SWOT.objects.filter(
            user_id=educator_email,
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
        logger.exception(f"Error in get_institution_educator_swot: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_institution_educator_swot_tests(request, educator_id):
    """
    Fetch available SWOT tests for a specific educator (institution view).
    
    Args:
        educator_id: The ID of the educator
        
    Returns: List of available test numbers
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get the educator and verify they belong to the same institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        # Get educator's email
        educator_email = educator.email
        
        # Fetch available test numbers
        tests = SWOT.objects.filter(user_id=educator_email).values_list('test_num', flat=True).distinct()
        
        return Response({"available_tests": list(tests)})
        
    except Exception as e:
        logger.exception(f"Error in list_institution_educator_swot_tests: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution_educator_students(request, educator_id):
    """
    Fetch all students for a specific educator (institution view).
    
    Args:
        educator_id: The ID of the educator
        
    Returns: List of students in the educator's class
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get the educator and verify they belong to the same institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
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
        logger.exception(f"Error in get_institution_educator_students: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_institution_student(request, educator_id):
    """
    Create a new student for the educator's class (institution manager action).
    Request body should include: student_id, name, dob (YYYY-MM-DD), optionally neo4j_db, independant (bool).
    """
    try:
        manager_email = request.user.email
        logger.info(f"[CREATE_STUDENT] Request from email={manager_email} for educator_id={educator_id}")
        manager = Manager.objects.filter(email=manager_email).first()
        logger.info(f"[CREATE_STUDENT] Manager lookup result: {manager}")
        if not manager:
            return Response({"error": "Manager not found"}, status=404)

        educator = Educator.objects.filter(id=educator_id).first()
        if not educator:
            return Response({"error": "Educator not found"}, status=404)

        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)

        class_id = educator.class_id

        student_id = request.data.get('student_id')
        name = request.data.get('name')
        dob = request.data.get('dob')

        # Only required fields are accepted for creation
        if not student_id or not name or not dob:
            return Response({"error": "student_id, name and dob are required"}, status=400)

        # Prevent duplicates
        if Student.objects.filter(student_id=student_id, class_id=class_id).exists():
            return Response({"error": "Student already exists in this class"}, status=400)

        # Build neo4j_db name automatically
        candidate = f"db{student_id}{class_id}"
        neo4j_db = re.sub(r'[^A-Za-z0-9]', '', candidate)

        # Default password: use student_id (will be hashed by model save)
        student = Student(
            student_id=student_id,
            name=name,
            dob=dob,
            class_id=class_id,
            neo4j_db=neo4j_db,
            password=student_id
        )
        student.save()

        return Response({"message": "Student created successfully", "student": {"student_id": student.student_id, "name": student.name, "dob": str(student.dob)}}, status=201)

    except Exception as e:
        logger.exception(f"Error in create_institution_student: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_institution_student(request, educator_id, student_id):
    """
    Update or delete a student belonging to the educator's class.
    PUT/PATCH: body may include name, dob, neo4j_db, independant, password
    DELETE: deletes student and related per-student records and their neo4j DB
    """
    try:
        manager_email = request.user.email
        logger.info(f"[MANAGE_STUDENT] {request.method} from email={manager_email} educator_id={educator_id} student_id={student_id}")
        manager = Manager.objects.filter(email=manager_email).first()
        logger.info(f"[MANAGE_STUDENT] Manager lookup result: {manager}")
        if not manager:
            return Response({"error": "Manager not found"}, status=404)

        educator = Educator.objects.filter(id=educator_id).first()
        if not educator:
            return Response({"error": "Educator not found"}, status=404)

        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)

        class_id = educator.class_id

        student = Student.objects.filter(student_id=student_id, class_id=class_id).first()
        logger.info(f"[MANAGE_STUDENT] Student lookup for {student_id} in class {class_id}: {student}")
        if not student:
            logger.warning(f"[MANAGE_STUDENT] Student {student_id} not found in class {class_id}")
            return Response({"error": "Student not found"}, status=404)

        if request.method == 'DELETE':
            # Log initial state
            logger.info(f"[DELETE_STUDENT] Starting deletion for student_id={student_id}, class_id={class_id}")
            
            # Count records before deletion
            result_count = Result.objects.filter(student_id=student_id, class_id=class_id).count()
            swot_count = SWOT.objects.filter(user_id=student_id, class_id=class_id).count()
            response_count = StudentResponse.objects.filter(student_id=student_id, class_id=class_id).count()
            overview_count = Overview.objects.filter(user_id=student_id, class_id=class_id).count()
            performance_count = Performance.objects.filter(user_id=student_id, class_id=class_id).count()
            
            logger.info(f"[DELETE_STUDENT] Found records - Result: {result_count}, SWOT: {swot_count}, Response: {response_count}, Overview: {overview_count}, Performance: {performance_count}")
            
            # Attempt to delete student's neo4j DB if present
            try:
                db_name = str(student.neo4j_db).lower()
                if db_name:
                    logger.info(f"[DELETE_STUDENT] Attempting to delete Neo4j DB: {db_name}")
                    delete_db(db_name)
                    logger.info(f"[DELETE_STUDENT] Neo4j DB deleted successfully")
            except Exception as e:
                logger.exception(f"[DELETE_STUDENT] Failed to delete student's neo4j db: {str(e)}")

            # Delete related per-student records with detailed logging
            try:
                deleted_results = Result.objects.filter(student_id=student_id, class_id=class_id).delete()
                logger.info(f"[DELETE_STUDENT] Deleted Result records: {deleted_results}")
                
                deleted_swot = SWOT.objects.filter(user_id=student_id, class_id=class_id).delete()
                logger.info(f"[DELETE_STUDENT] Deleted SWOT records: {deleted_swot}")
                
                deleted_response = StudentResponse.objects.filter(student_id=student_id, class_id=class_id).delete()
                logger.info(f"[DELETE_STUDENT] Deleted StudentResponse records: {deleted_response}")
                
                deleted_overview = Overview.objects.filter(user_id=student_id, class_id=class_id).delete()
                logger.info(f"[DELETE_STUDENT] Deleted Overview records: {deleted_overview}")
                
                deleted_performance = Performance.objects.filter(user_id=student_id, class_id=class_id).delete()
                logger.info(f"[DELETE_STUDENT] Deleted Performance records: {deleted_performance}")
                
                # Delete the student record itself
                student.delete()
                logger.info(f"[DELETE_STUDENT] Deleted Student record: {student_id}")
                
                return Response({
                    "message": "Student and related data deleted successfully",
                    "deleted_counts": {
                        "results": deleted_results[0] if deleted_results else 0,
                        "swot": deleted_swot[0] if deleted_swot else 0,
                        "responses": deleted_response[0] if deleted_response else 0,
                        "overview": deleted_overview[0] if deleted_overview else 0,
                        "performance": deleted_performance[0] if deleted_performance else 0
                    }
                }, status=200)
            except Exception as e:
                logger.exception(f"[DELETE_STUDENT] Error during PostgreSQL deletion: {str(e)}")
                return Response({"error": f"Failed to delete records: {str(e)}"}, status=500)

        # Update
        data = request.data
        updated = False
        if 'name' in data:
            student.name = data.get('name')
            updated = True
        if 'dob' in data:
            student.dob = data.get('dob')
            updated = True
        if 'neo4j_db' in data:
            student.neo4j_db = data.get('neo4j_db')
            updated = True
        # 'independant' is intentionally not updatable by institution managers
        if 'password' in data:
            # Use model helper to set password properly
            student.set_password(data.get('password'))
            updated = True

        if updated:
            student.save()

        return Response({"message": "Student updated", "student": {"student_id": student.student_id, "name": student.name, "dob": str(student.dob)}}, status=200)

    except Exception as e:
        logger.exception(f"Error in manage_institution_student: {str(e)}")
        return Response({"error": str(e)}, status=500)
