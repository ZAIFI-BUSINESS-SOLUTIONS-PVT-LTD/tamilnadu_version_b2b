"""
Institution Views
Endpoints for institution (manager) to view and manage educators and their students.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from django.db import transaction
from exam.models import Educator, Student, Overview, Result, SWOT, Manager
import json
import logging
import re

from exam.graph_utils.delete_graph import delete_db, delete_test_graph
from exam.models import StudentResponse, Performance, StudentResult, QuestionAnalysis, Test
from exam.services.update_dashboard import update_single_student_dashboard
from exam.utils.student_analysis import analyze_single_student, fetch_student_responses
from exam.graph_utils.create_graph import create_graph
import pandas as pd
import csv
from io import TextIOWrapper

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
def get_institution_educator_student_insights(request, educator_id):
    """
    Fetch student insights for a specific student under an educator (institution view).
    This is used when generating PDF reports from institution dashboard.
    
    Args:
        educator_id: The ID of the educator
        
    Request body:
        student_id: The student ID
        test_num: The test number (0 for overall)
        
    Returns: Student insights including SWOT and overview data
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
        
        # Get request parameters
        student_id = request.data.get("student_id")
        test_num = request.data.get("test_num", 0)
        
        if not student_id:
            return Response({"error": "student_id is required"}, status=400)
        
        # Verify student belongs to educator's class
        class_id = educator.class_id
        student = Student.objects.filter(student_id=student_id, class_id=class_id).first()
        
        if not student:
            return Response({"error": "Student not found in educator's class"}, status=404)
        
        # Fetch SWOT data
        swot_data = {}
        swot_record = SWOT.objects.filter(
            user_id=student_id,
            class_id=class_id,
            test_num=test_num,
            swot_parameter="swot"
        ).first()
        
        if swot_record:
            try:
                swot_data = json.loads(swot_record.swot_value)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse SWOT data for student {student_id}")
                swot_data = {}
        
        # Fetch overview data
        overview_data = {}
        overview_record = Overview.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).first()
        
        if overview_record:
            overview_data = {
                "correct": overview_record.correct,
                "incorrect": overview_record.incorrect,
                "left_out": overview_record.left_out,
                "attended": overview_record.attended,
                "accuracy": overview_record.accuracy,
                "total_questions": overview_record.total_questions
            }
        
        return Response({
            "swot": swot_data,
            "overview": overview_data,
            "student_id": student_id,
            "class_id": class_id,
            "test_num": test_num
        }, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_educator_student_insights: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_institution_student_insights(request):
    """
    Fetch student insights directly using institution JWT (for PDF generation).
    Institution JWT has access to all students under all educators in the institution.
    
    Request body:
        student_id: The student ID
        test_num: The test number (0 for overall)
        educator_id: Optional - the educator ID (used for validation)
        
    Returns: Student insights including SWOT and overview data
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Get request parameters
        student_id = request.data.get("student_id")
        test_num = request.data.get("test_num", 0)
        educator_id = request.data.get("educator_id")
        
        if not student_id:
            return Response({"error": "student_id is required"}, status=400)
        
        # Find student and verify they belong to an educator in this institution
        student = Student.objects.filter(student_id=student_id).first()
        
        if not student:
            return Response({"error": "Student not found"}, status=404)
        
        # Verify student's class belongs to an educator in this institution
        educator = Educator.objects.filter(class_id=student.class_id).first()
        
        if not educator:
            return Response({"error": "No educator found for student's class"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Student does not belong to your institution"}, status=403)
        
        # If educator_id is provided, verify it matches
        if educator_id and str(educator.id) != str(educator_id):
            # Check if the provided educator_id also belongs to this institution
            provided_educator = Educator.objects.filter(id=educator_id).first()
            if not provided_educator or provided_educator.institution != manager.institution:
                return Response({"error": "Provided educator does not belong to your institution"}, status=403)
        
        # Fetch SWOT data
        swot_data = {}
        swot_record = SWOT.objects.filter(
            user_id=student_id,
            class_id=student.class_id,
            test_num=test_num,
            swot_parameter="swot"
        ).first()
        
        if swot_record:
            try:
                swot_data = json.loads(swot_record.swot_value)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse SWOT data for student {student_id}")
                swot_data = {}
        
        # Fetch overview data
        overview_records = Overview.objects.filter(user_id=student_id, class_id=student.class_id)
        
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
        
        # Key insights data (KS, AI, QR, CV)
        metric_dict = {r.metric_name: r.metric_value for r in overview_records}

        keyInsightsData = {
            "keyStrengths": json.loads(metric_dict.get('KS', '[]')),
            "areasForImprovement": json.loads(metric_dict.get('AI', '[]')),
            "quickRecommendations": json.loads(metric_dict.get('QR', '[]')),
            "yetToDecide": json.loads(metric_dict.get('CV', '[]')),
        }
        
        overview_data = {
            "summaryCardsData": summaryCardsData,
            "keyInsightsData": keyInsightsData,
        }
        
        return Response({
            "swot": swot_data,
            "overview": overview_data,
            "student_id": student_id,
            "class_id": student.class_id,
            "test_num": test_num
        }, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_student_insights: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution_students(request):
    """
    Fetch all students in the institution (for PDF report validation).
    
    Returns: List of all students across all educators in the institution
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        institution = manager.institution
        
        if not institution:
            return Response({"error": "Manager has no assigned institution"}, status=400)
        
        # Get all educators in this institution
        educators = Educator.objects.filter(institution=institution)
        class_ids = [e.class_id for e in educators]
        
        # Fetch all students in these classes
        students = Student.objects.filter(class_id__in=class_ids).values('student_id', 'name', 'dob', 'class_id')
        
        # Add institution to each student's data
        students_with_inst = [
            {**student, 'inst': institution}
            for student in students
        ]
        
        return Response({"students": students_with_inst}, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_students: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_institution_all_student_results(request):
    """
    Fetch all student results across all educators in the institution.
    
    Returns: Results for all students in the institution
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        institution = manager.institution
        
        if not institution:
            return Response({"error": "Manager has no assigned institution"}, status=400)
        
        # Get all educators in this institution
        educators = Educator.objects.filter(institution=institution)
        class_ids = [e.class_id for e in educators]
        
        # Fetch all results for students in these classes
        results = Result.objects.filter(class_id__in=class_ids).values(
            'student_id', 'test_num', 'class_id',
            'phy_score', 'chem_score', 'bot_score', 'zoo_score', 'bio_score',
            'phy_correct', 'chem_correct', 'bot_correct', 'zoo_correct', 'bio_correct',
            'phy_attended', 'chem_attended', 'bot_attended', 'zoo_attended', 'bio_attended',
            'phy_total', 'chem_total', 'bot_total', 'zoo_total', 'bio_total'
        )
        
        return Response({"results": list(results)}, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_all_student_results: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_institution_teacher_dashboard(request):
    """
    Fetch teacher dashboard data for institution (class_id from educator).
    Institution JWT has access to all educators, so we need educator_id or class_id.
    
    Query params (GET) or body (POST):
        educator_id: The educator ID to get dashboard for
        testId: The test ID/number (optional, 0 or 'Overall' for overall)
        
    Returns: Teacher dashboard data (same structure as educator dashboard)
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        institution = manager.institution
        
        if not institution:
            return Response({"error": "Manager has no assigned institution"}, status=400)
        
        # Get educator_id from query params or body
        if request.method == 'GET':
            educator_id = request.GET.get('educator_id') or request.GET.get('educatorId')
            test_id = request.GET.get('testId') or request.GET.get('test_id') or '0'
        else:
            educator_id = request.data.get('educator_id') or request.data.get('educatorId')
            test_id = request.data.get('testId') or request.data.get('test_id') or '0'
        
        if not educator_id:
            return Response({"error": "educator_id is required"}, status=400)
        
        # Verify educator belongs to this institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        # Use educator's class_id and email for the dashboard
        class_id = educator.class_id
        educator_email = educator.email
        
        # Parse test_id
        test_num = 0
        if test_id and test_id != 'Overall':
            try:
                if isinstance(test_id, str) and 'Test' in test_id:
                    test_num = int(test_id.split()[-1])
                else:
                    test_num = int(test_id)
            except (ValueError, IndexError):
                test_num = 0
        
        # Fetch dashboard data from Overview model (similar to educator endpoint)
        from exam.models import Overview as OverviewModel
        
        overview_record = OverviewModel.objects.filter(
            student_id=educator_email,
            class_id=class_id,
            test_num=test_num
        ).first()
        
        dashboard_data = {}
        if overview_record:
            dashboard_data = {
                "correct": overview_record.correct,
                "incorrect": overview_record.incorrect,
                "left_out": overview_record.left_out,
                "attended": overview_record.attended,
                "accuracy": overview_record.accuracy,
                "total_questions": overview_record.total_questions
            }
        
        return Response(dashboard_data, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_teacher_dashboard: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_institution_teacher_swot(request):
    """
    Fetch teacher SWOT data for institution.
    
    Query params (GET) or body (POST):
        educator_id: The educator ID
        testId: The test ID (optional, 0 or 'Overall' for overall)
        
    Returns: SWOT data for the educator/teacher
    """
    try:
        # Get the logged-in manager
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        institution = manager.institution
        
        if not institution:
            return Response({"error": "Manager has no assigned institution"}, status=400)
        
        # Get educator_id from query params or body
        if request.method == 'GET':
            educator_id = request.GET.get('educator_id') or request.GET.get('educatorId')
            test_id = request.GET.get('testId') or request.GET.get('test_id') or '0'
        else:
            educator_id = request.data.get('educator_id') or request.data.get('educatorId')
            test_id = request.data.get('testId') or request.data.get('test_id') or '0'
        
        if not educator_id:
            return Response({"error": "educator_id is required"}, status=400)
        
        # Verify educator belongs to this institution
        educator = Educator.objects.filter(id=educator_id).first()
        
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        class_id = educator.class_id
        educator_email = educator.email
        
        # Parse test_id
        test_num = 0
        if test_id and test_id != 'Overall':
            try:
                if isinstance(test_id, str) and 'Test' in test_id:
                    test_num = int(test_id.split()[-1])
                else:
                    test_num = int(test_id)
            except (ValueError, IndexError):
                test_num = 0
        
        # Fetch SWOT record
        swot_record = SWOT.objects.filter(
            user_id=educator_email,
            class_id=class_id,
            test_num=test_num,
            swot_parameter="swot"
        ).first()
        
        swot_data = {}
        if swot_record:
            try:
                swot_data = json.loads(swot_record.swot_value)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse SWOT data for educator {educator_email}")
                swot_data = {}
        
        return Response({"swot": swot_data}, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_institution_teacher_swot: {str(e)}")
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


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_institution_student_test(request, educator_id, student_id, test_num):
    """
    Delete a specific test for a student (removes Neo4j test nodes and Postgres per-test rows).
    After deletion, regenerates the student's Overview and Performance dashboard.
    
    Args:
        educator_id: The ID of the educator
        student_id: The student's ID
        test_num: The test number to delete
        
    Returns:
        JSON with deleted counts, Neo4j status, and dashboard regeneration status
    """
    try:
        # Verify manager authentication
        manager_email = request.user.email
        logger.info(f"[DELETE_TEST] Request from email={manager_email} for educator_id={educator_id} student_id={student_id} test_num={test_num}")
        
        manager = Manager.objects.filter(email=manager_email).first()
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Verify educator belongs to manager's institution
        educator = Educator.objects.filter(id=educator_id).first()
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        class_id = educator.class_id
        
        # Verify student exists
        student = Student.objects.filter(student_id=student_id, class_id=class_id).first()
        if not student:
            logger.warning(f"[DELETE_TEST] Student {student_id} not found in class {class_id}")
            return Response({"error": "Student not found"}, status=404)
        
        # Get Neo4j database name
        db_name = str(student.neo4j_db).lower()
        
        # Log initial state
        logger.info(f"[DELETE_TEST] Starting deletion for student_id={student_id}, class_id={class_id}, test_num={test_num}")
        
        # Count records before deletion
        result_count = Result.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).count()
        student_result_count = StudentResult.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).count()
        response_count = StudentResponse.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).count()
        swot_count = SWOT.objects.filter(user_id=student_id, class_id=class_id, test_num=test_num).count()
        
        logger.info(f"[DELETE_TEST] Found records - Result: {result_count}, StudentResult: {student_result_count}, Response: {response_count}, SWOT: {swot_count}")
        
        # Step 1: Delete Neo4j test nodes
        neo4j_status = "ok"
        neo4j_message = None
        
        try:
            if db_name:
                logger.info(f"[DELETE_TEST] Attempting to delete Neo4j Test{test_num} from database: {db_name}")
                delete_test_graph(db_name, test_num)
                logger.info(f"[DELETE_TEST] Neo4j test nodes deleted successfully")
        except Exception as e:
            neo4j_status = "failed"
            neo4j_message = str(e)
            logger.exception(f"[DELETE_TEST] Failed to delete Neo4j test nodes: {str(e)}")
        
        # Step 2: Delete Postgres per-test records within transaction
        deleted_counts = {}
        
        try:
            with transaction.atomic():
                deleted_results = Result.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).delete()
                logger.info(f"[DELETE_TEST] Deleted Result records: {deleted_results}")
                
                deleted_student_results = StudentResult.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).delete()
                logger.info(f"[DELETE_TEST] Deleted StudentResult records: {deleted_student_results}")
                
                deleted_responses = StudentResponse.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).delete()
                logger.info(f"[DELETE_TEST] Deleted StudentResponse records: {deleted_responses}")
                
                deleted_swot = SWOT.objects.filter(user_id=student_id, class_id=class_id, test_num=test_num).delete()
                logger.info(f"[DELETE_TEST] Deleted SWOT records: {deleted_swot}")
                
                deleted_counts = {
                    "results": deleted_results[0] if deleted_results else 0,
                    "student_results": deleted_student_results[0] if deleted_student_results else 0,
                    "responses": deleted_responses[0] if deleted_responses else 0,
                    "swot": deleted_swot[0] if deleted_swot else 0
                }
                
        except Exception as e:
            logger.exception(f"[DELETE_TEST] Error during Postgres deletion: {str(e)}")
            return Response({"error": f"Failed to delete Postgres records: {str(e)}"}, status=500)
        
        # Step 3: Regenerate student dashboard (Overview and Performance)
        dashboard_status = "ok"
        dashboard_message = None
        
        try:
            # Find remaining tests for this student to determine latest test_num
            remaining_tests = Result.objects.filter(
                student_id=student_id, 
                class_id=class_id
            ).values_list('test_num', flat=True).order_by('-test_num')
            
            if remaining_tests:
                latest_test_num = remaining_tests[0]
                logger.info(f"[DELETE_TEST] Regenerating dashboard for student {student_id} using test_num={latest_test_num}")
                
                # Call dashboard update function
                dashboard_result = update_single_student_dashboard(student_id, class_id, latest_test_num, db_name)
                
                if dashboard_result.get('ok'):
                    logger.info(f"[DELETE_TEST] Dashboard regenerated successfully for {student_id}")
                else:
                    dashboard_status = "partial"
                    dashboard_message = dashboard_result.get('error', 'Unknown error')
                    logger.warning(f"[DELETE_TEST] Dashboard regeneration had issues: {dashboard_message}")
            else:
                # No tests remaining - clear Overview and Performance tables
                logger.info(f"[DELETE_TEST] No remaining tests. Clearing Overview and Performance for {student_id}")
                Overview.objects.filter(user_id=student_id, class_id=class_id).delete()
                Performance.objects.filter(user_id=student_id, class_id=class_id).delete()
                dashboard_message = "No tests remaining - cleared all dashboard data"
                
        except Exception as e:
            dashboard_status = "failed"
            dashboard_message = str(e)
            logger.exception(f"[DELETE_TEST] Error regenerating dashboard: {str(e)}")
        
        # Prepare response
        response_data = {
            "message": f"Test {test_num} deleted successfully for student {student_id}",
            "deleted_counts": deleted_counts,
            "neo4j": {
                "status": neo4j_status,
                "message": neo4j_message
            },
            "dashboard": {
                "status": dashboard_status,
                "message": dashboard_message
            }
        }
        
        logger.info(f"[DELETE_TEST] Completed deletion for student {student_id} test {test_num}")
        return Response(response_data, status=200)
        
    except Exception as e:
        logger.exception(f"Error in delete_institution_student_test: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reupload_institution_student_responses(request, educator_id):
    """
    Re-upload and reprocess responses for a single student.
    Used when a student's responses were wrongly uploaded.
    
    Request:
        - class_id (optional, defaults to educator's class)
        - student_id (required)
        - test_num (required)
        - response_csv (required file)
        
    Process:
        1. Parse CSV and update StudentResponse table for that student
        2. Run student analysis using existing QuestionAnalysis data
        3. Update student dashboard (Overview, Performance, SWOT)
        
    Returns:
        JSON with processing status and dashboard regeneration status
    """
    try:
        # Verify manager authentication
        manager_email = request.user.email
        logger.info(f"[REUPLOAD_STUDENT] Request from email={manager_email} for educator_id={educator_id}")
        
        manager = Manager.objects.filter(email=manager_email).first()
        if not manager:
            return Response({"error": "Manager not found"}, status=404)
        
        # Verify educator belongs to manager's institution
        educator = Educator.objects.filter(id=educator_id).first()
        if not educator:
            return Response({"error": "Educator not found"}, status=404)
        
        if educator.institution != manager.institution:
            return Response({"error": "Unauthorized: Educator does not belong to your institution"}, status=403)
        
        # Get parameters
        class_id = request.data.get('class_id') or educator.class_id
        student_id = request.data.get('student_id')
        test_num = request.data.get('test_num')
        
        if not student_id or not test_num:
            return Response({"error": "student_id and test_num are required"}, status=400)
        
        try:
            test_num = int(test_num)
        except (ValueError, TypeError):
            return Response({"error": "test_num must be an integer"}, status=400)
        
        # Verify student exists
        student = Student.objects.filter(student_id=student_id, class_id=class_id).first()
        if not student:
            return Response({"error": f"Student {student_id} not found in class {class_id}"}, status=404)
        
        # Verify test exists
        test = Test.objects.filter(class_id=class_id, test_num=test_num).first()
        if not test:
            return Response({"error": f"Test {test_num} not found for class {class_id}"}, status=404)
        
        # Get CSV file
        if 'response_csv' not in request.FILES:
            return Response({"error": "response_csv file is required"}, status=400)
        
        csv_file = request.FILES['response_csv']
        
        logger.info(f"[REUPLOAD_STUDENT] Processing for student_id={student_id}, class_id={class_id}, test_num={test_num}")
        
        # Step 1: Parse CSV and extract responses for this student
        responses_data = []
        answer_map = {
            'A': '1', 'B': '2', 'C': '3', 'D': '4',
            1: '1', 2: '2', 3: '3', 4: '4', 
            '1': '1', '2': '2', '3': '3', '4': '4'
        }
        
        try:
            # Read CSV file
            csv_file.seek(0)
            decoded_file = TextIOWrapper(csv_file, encoding='utf-8-sig')
            reader = csv.reader(decoded_file)
            rows = list(reader)
            
            if not rows or len(rows) < 2:
                return Response({"error": "CSV file is empty or invalid"}, status=400)
            
            # First row should have student IDs
            header = rows[0]
            student_id_str = str(student_id).strip()
            
            # Find column index for this student
            student_col_idx = None
            for idx, col in enumerate(header[1:], start=1):  # Skip first column (question numbers)
                if str(col).strip() == student_id_str:
                    student_col_idx = idx
                    break
            
            if student_col_idx is None:
                return Response({"error": f"Student ID {student_id} not found in CSV header"}, status=400)
            
            # Parse responses
            for row in rows[1:]:
                if not row or len(row) < 2:
                    continue
                
                question_number_str = str(row[0]).strip()
                if not question_number_str.isdigit():
                    continue
                
                question_number = int(question_number_str)
                
                if student_col_idx >= len(row):
                    continue
                
                raw_answer = row[student_col_idx]
                
                # Map answer
                if pd.isna(raw_answer) or raw_answer == '' or str(raw_answer).strip() == '':
                    mapped_answer = None
                else:
                    if isinstance(raw_answer, (int, float)):
                        int_val = int(raw_answer)
                        mapped_answer = answer_map.get(int_val, None)
                    else:
                        answer = str(raw_answer).strip().upper()
                        answer = answer.rstrip('0').rstrip('.') if '.' in answer else answer
                        mapped_answer = answer_map.get(answer, None)
                
                responses_data.append({
                    "question_number": question_number,
                    "selected_answer": mapped_answer
                })
            
            if not responses_data:
                return Response({"error": "No valid responses found in CSV for this student"}, status=400)
            
            logger.info(f"[REUPLOAD_STUDENT] Parsed {len(responses_data)} responses for student {student_id}")
            
        except Exception as e:
            logger.exception(f"[REUPLOAD_STUDENT] Error parsing CSV: {str(e)}")
            return Response({"error": f"Failed to parse CSV: {str(e)}"}, status=500)
        
        # Step 2: Delete existing responses and insert new ones (within transaction)
        response_status = "ok"
        response_message = None
        
        try:
            with transaction.atomic():
                # Delete old responses
                deleted_count = StudentResponse.objects.filter(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=test_num
                ).delete()
                
                logger.info(f"[REUPLOAD_STUDENT] Deleted {deleted_count[0]} old responses")
                
                # Insert new responses
                response_objects = [
                    StudentResponse(
                        student_id=student_id,
                        class_id=class_id,
                        test_num=test_num,
                        question_number=resp["question_number"],
                        selected_answer=resp["selected_answer"]
                    )
                    for resp in responses_data
                ]
                
                StudentResponse.objects.bulk_create(response_objects)
                logger.info(f"[REUPLOAD_STUDENT] Inserted {len(response_objects)} new responses")
                
        except Exception as e:
            response_status = "failed"
            response_message = str(e)
            logger.exception(f"[REUPLOAD_STUDENT] Error updating responses: {str(e)}")
            return Response({"error": f"Failed to update responses: {str(e)}"}, status=500)
        
        # Step 3: Run student analysis
        analysis_status = "ok"
        analysis_message = None
        
        try:
            # Fetch all questions for this test from QuestionAnalysis
            questions = list(QuestionAnalysis.objects.filter(
                class_id=class_id,
                test_num=test_num
            ).values(
                'question_number', 'subject', 'chapter', 'topic', 'subtopic',
                'typeOfquestion', 'question_text', 'correct_answer',
                'option_1', 'option_2', 'option_3', 'option_4',
                'option_1_feedback', 'option_2_feedback', 'option_3_feedback', 'option_4_feedback',
                'option_1_type', 'option_2_type', 'option_3_type', 'option_4_type',
                'option_1_misconception', 'option_2_misconception', 
                'option_3_misconception', 'option_4_misconception', 'im_desp'
            ))
            
            if not questions:
                analysis_status = "failed"
                analysis_message = "No QuestionAnalysis data found for this test"
                logger.warning(f"[REUPLOAD_STUDENT] No questions found for class {class_id}, test {test_num}")
            else:
                # Fetch updated responses
                response_map = fetch_student_responses(student_id, class_id, test_num)
                
                if not response_map:
                    analysis_status = "failed"
                    analysis_message = "No responses found after upload"
                    logger.warning(f"[REUPLOAD_STUDENT] No response_map for student {student_id}")
                else:
                    # Run analysis
                    test_date = test.date
                    db_name = str(student.neo4j_db).lower()
                    
                    # Delete existing Neo4j test data first
                    try:
                        delete_test_graph(db_name, test_num)
                        logger.info(f"[REUPLOAD_STUDENT] Deleted old Neo4j Test{test_num} from {db_name}")
                    except Exception as e:
                        logger.warning(f"[REUPLOAD_STUDENT] Failed to delete old Neo4j data: {str(e)}")
                    
                    # Delete existing Result and StudentResult rows
                    Result.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).delete()
                    StudentResult.objects.filter(student_id=student_id, class_id=class_id, test_num=test_num).delete()
                    
                    # Run synchronous analysis (not as Celery task since this is immediate)
                    from exam.utils.student_analysis import StudentAnalyzer
                    
                    analyzer = StudentAnalyzer(
                        student_id, class_id, test_num, db_name, test_date, questions, response_map
                    )
                    analyzer.analyze()
                    summary_df = analyzer.get_summary()
                    analyzer.save_results(summary_df)
                    
                    # Create knowledge graph
                    create_graph(student_id, db_name, pd.DataFrame(analyzer.analysis), test_num)
                    
                    logger.info(f"[REUPLOAD_STUDENT] Analysis completed for student {student_id}, test {test_num}")
                    
        except Exception as e:
            analysis_status = "failed"
            analysis_message = str(e)
            logger.exception(f"[REUPLOAD_STUDENT] Error during analysis: {str(e)}")
        
        # Step 4: Regenerate student dashboard
        dashboard_status = "ok"
        dashboard_message = None
        
        if analysis_status == "ok":
            try:
                db_name = str(student.neo4j_db).lower()
                dashboard_result = update_single_student_dashboard(student_id, class_id, test_num, db_name)
                
                if dashboard_result.get('ok'):
                    logger.info(f"[REUPLOAD_STUDENT] Dashboard regenerated successfully for {student_id}")
                else:
                    dashboard_status = "partial"
                    dashboard_message = dashboard_result.get('error', 'Unknown error')
                    logger.warning(f"[REUPLOAD_STUDENT] Dashboard regeneration had issues: {dashboard_message}")
                    
            except Exception as e:
                dashboard_status = "failed"
                dashboard_message = str(e)
                logger.exception(f"[REUPLOAD_STUDENT] Error regenerating dashboard: {str(e)}")
        else:
            dashboard_status = "skipped"
            dashboard_message = "Skipped due to analysis failure"
        
        # Prepare response
        response_data = {
            "message": f"Student {student_id} responses re-uploaded and reprocessed for test {test_num}",
            "responses": {
                "status": response_status,
                "count": len(responses_data),
                "message": response_message
            },
            "analysis": {
                "status": analysis_status,
                "message": analysis_message
            },
            "dashboard": {
                "status": dashboard_status,
                "message": dashboard_message
            }
        }
        
        logger.info(f"[REUPLOAD_STUDENT] Completed reupload for student {student_id}, test {test_num}")
        return Response(response_data, status=200)
        
    except Exception as e:
        logger.exception(f"Error in reupload_institution_student_responses: {str(e)}")
        return Response({"error": str(e)}, status=500)
