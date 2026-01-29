from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from exam.models.overview import Overview
from exam.models.performance import Performance
from exam.models.checkpoints import Checkpoints
import json
from rest_framework.permissions import IsAuthenticated
from exam.models.student import Student
from exam.models.swot import SWOT
from django.http import JsonResponse
from exam.models.educator import Educator
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_details(request):
    try:
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()
        name=student.name
        class_id=student.class_id
        inst = Educator.objects.filter(class_id=class_id).first()
        inst_name = inst.name if inst else None
        inst_domain = inst.institution if inst else None
        inst_subdomain = normalize_subdomain(inst_domain)
        return JsonResponse({
            'name': name,
            'student_id': student_id,
            'class_id': class_id,
            'inst': inst_name,
            'institute_subdomain': inst_subdomain,
        }, status=200)

    except Exception as e:
        logger.exception(f"Error in get_student_details: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_dashboard(request):

    try:
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()
        class_id=student.class_id

        records = Overview.objects.filter(user_id=student_id, class_id=class_id)

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

        # Get Action Plan, Checklist, and Study Tips
        action_plan = json.loads(metric_dict.get('AP', '[]'))
        checklist = json.loads(metric_dict.get('CL', '[]'))
        study_tips = json.loads(metric_dict.get('ST', '[]'))
        
        performanceTrendDataMapping = json.loads(metric_dict.get('PT', '[]'))
        subjectWiseDataMapping = json.loads(metric_dict.get('SA', '[]'))

        # Include compact test metadata mapping for the student's class
        try:
            metas = TestMetadata.objects.filter(class_id=class_id).order_by('test_num')
            test_metadata_map = {str(m.test_num): {'pattern': m.pattern, 'subject_order': m.subject_order, 'test_name': m.test_name} for m in metas}
        except Exception:
            test_metadata_map = {}


        return Response({
            "summaryCardsData": summaryCardsData,
            "performanceTrendDataMapping": performanceTrendDataMapping,
            "subjectWiseDataMapping": subjectWiseDataMapping,
            "keyInsightsData": keyInsightsData,
            "actionPlan": action_plan,
            "checklist": checklist,
            "studyTips": study_tips,
            "testMetadata": test_metadata_map
        })
    except Exception as e:
        logger.exception(f"Error in get_student_dashboard: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_performance(request):
    try:
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()
        if not student:
            return Response({"error": "Student not found"}, status=404)

        class_id = student.class_id
        records = Performance.objects.filter(user_id=student_id, class_id=class_id)

        performance_trend = {}
        concept_insights = {}

        for r in records:
            subject = r.subject or "Unknown"
            if r.metric_name == "PT":
                performance_trend[subject] = json.loads(r.metric_value)
            elif r.metric_name == "CI":
                concept_insights[subject] = json.loads(r.metric_value)

        return Response({
            "performanceData": performance_trend,
            "performanceInsights": concept_insights,
        })

    except Exception as e:
        logger.exception(f"Error in get_student_performance: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_student_swot(request):
    try:
        # Get logged-in student ID
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()

        if not student:
            return Response({"error": "Student not found"}, status=404)

        # Get test_num from the POST data
        test_num = request.data.get("test_num")
        if test_num is None:
            return Response({"error": "Missing 'test_num' in request body"}, status=400)
        # Debug: log received test_num and its type to help frontend/backend mismatch debugging
        logger.info(f"get_student_swot called for student={student_id} raw_test_num={request.data.get('test_num')} type={type(request.data.get('test_num'))}")

        # Filter records using test_num and student/class info
        class_id = student.class_id
        record = SWOT.objects.filter(
            user_id=student_id,
            class_id=class_id,
            test_num=test_num,
            swot_parameter="swot"
        ).first()

        if not record:
            logger.info(f"get_student_swot: no SWOT record found for student={student_id} class={class_id} test_num={test_num}")
            return Response({"error": "SWOT record not found"}, status=404)

        return Response({
            "swot": json.loads(record.swot_value)
        })

    except Exception as e:
        logger.exception(f"Error in get_student_swot: {str(e)}")
        return Response({"error": str(e)}, status=500)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_swot_tests(request):
    student_id = request.user.student_id
    tests = SWOT.objects.filter(user_id=student_id).values_list('test_num', flat=True).distinct()
    return Response({"available_tests": list(tests)})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_student_checkpoints(request):
    """
    Get combined checkpoints (checklist + action plan) for a specific test.
    POST body: {"test_num": <test_number>}
    """
    try:
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()

        if not student:
            return Response({"error": "Student not found"}, status=404)

        # Get test_num from POST data
        test_num = request.data.get("test_num")
        if test_num is None:
            return Response({"error": "Missing 'test_num' in request body"}, status=400)

        logger.info(f"get_student_checkpoints called for student={student_id} test_num={test_num}")

        # Fetch checkpoints record
        class_id = student.class_id
        record = Checkpoints.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).first()

        if not record:
            logger.info(f"No checkpoints found for student={student_id} class={class_id} test_num={test_num}")
            return Response({"checkpoints": []}, status=200)

        # Return the insights JSON directly
        return Response({
            "checkpoints": record.insights if record.insights else []
        })

    except Exception as e:
        logger.exception(f"Error in get_student_checkpoints: {str(e)}")
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_student_report_card(request):
    """
    Get comprehensive report card data for a specific test.
    POST body: {
        "test_num": <test_number> (optional, defaults to last test),
        "student_id": <student_id> (optional, for educator/institution context)
    }
    
    Returns data for two-page report card:
    - Page 1: Performance metrics, subject-wise charts, improvement trend, mistakes table
    - Page 2: Study planner, frequent mistakes, class vs student analysis
    """
    try:
        from exam.models.student_report import StudentReport
        from exam.models.test import Test
        from collections import defaultdict
        
        # Get student_id from request body (for educator/institution) or from JWT (for student)
        request_student_id = request.data.get("student_id")
        
        if request_student_id:
            # Educator/Institution context - verify access
            student_id = request_student_id
            student = Student.objects.filter(student_id=student_id).first()
            
            if not student:
                return Response({"error": "Student not found"}, status=404)
            
            # Verify educator/institution has access to this student
            from exam.models.educator import Educator
            from exam.models.manager import Manager
            
            user_email = request.user.email
            
            # Check if user is an educator with access to this student's class
            educator = Educator.objects.filter(email=user_email, class_id=student.class_id).first()
            
            # Check if user is an institution manager with access to this student
            if not educator:
                manager = Manager.objects.filter(email=user_email).first()
                if manager:
                    # Verify student belongs to an educator in this institution
                    educator = Educator.objects.filter(class_id=student.class_id, institution=manager.institution).first()
                    if not educator:
                        return Response({"error": "Unauthorized: Student does not belong to your institution"}, status=403)
                else:
                    return Response({"error": "Unauthorized: Access denied"}, status=403)
        else:
            # Student context - use JWT student_id
            student_id = request.user.student_id
            student = Student.objects.filter(student_id=student_id).first()

            if not student:
                return Response({"error": "Student not found"}, status=404)

        class_id = student.class_id
        
        # Get available tests for this student
        available_tests = Test.objects.filter(class_id=class_id).order_by('test_num').values_list('test_num', flat=True)
        available_tests = list(available_tests)
        
        if not available_tests:
            return Response({"error": "No tests found for this student"}, status=404)
        
        # Get test_num from request or default to last test
        test_num = request.data.get("test_num")
        if test_num is None:
            test_num = available_tests[-1]  # Last test
        else:
            test_num = int(test_num)
            
        logger.info(f"get_student_report_card called for student={student_id} test_num={test_num}")

        # Fetch current test report
        current_report = StudentReport.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).first()

        if not current_report:
            return Response({"error": f"No report found for test {test_num}"}, status=404)

        # Fetch all reports for trend analysis
        all_reports = StudentReport.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num__lte=test_num
        ).order_by('test_num')

        # Fetch checkpoints for mistakes table
        checkpoints = Checkpoints.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).first()

        # === PAGE 1 DATA ===
        
        # Header & Top Summary Cards
        page1_data = {
            "student_name": student.name,
            "total_marks": current_report.mark,
            "improvement_percentage": round(current_report.improvement_rate, 1),
            "average_marks": round(current_report.average, 1),
        }

        # Subject-wise pie charts
        subject_wise_data = []
        subject_wise = current_report.subject_wise or {}
        subject_wise_avg = current_report.subject_wise_avg or {}
        
        for subject, counts in subject_wise.items():
            subject_wise_data.append({
                "subject": subject,
                "correct_count": counts.get("correct", 0),
                "incorrect_count": counts.get("incorrect", 0),
                "skipped_count": counts.get("skipped", 0),
                "subject_average_marks": round(subject_wise_avg.get(subject, 0), 1)
            })
        
        page1_data["subject_wise_data"] = subject_wise_data

        # Performance Trend Line Graph - Send sub_wise_marks as-is
        # Format: { "1": {"Botany": 138, "Physics": 78, ...}, "2": {...}, ... }
        page1_data["performance_trend"] = current_report.sub_wise_marks or {}

        # Mistakes Table (from checkpoints - first TWO checkpoints per subject)
        mistakes_table = []
        if checkpoints and checkpoints.insights:
            subject_counts = {}  # Track how many mistakes we've added per subject
            for insight in checkpoints.insights:
                subject = insight.get("subject", "")
                if subject:
                    # Add up to 2 mistakes per subject
                    if subject not in subject_counts:
                        subject_counts[subject] = 0
                    
                    if subject_counts[subject] < 2:
                        mistakes_table.append({
                            "subject": subject,
                            "subtopic": insight.get("subtopic", ""),
                            "mistake_detail": insight.get("checkpoint", ""),
                            "checked": False
                        })
                        subject_counts[subject] += 1
        
        page1_data["mistakes_table"] = mistakes_table

        # === PAGE 2 DATA ===
        
        page2_data = {}

        # Study Planner Table (6 days × subjects)
        subtopic_list = current_report.subtopic_list or {}
        study_planner = []
        
        # Get all subjects
        subjects = list(subtopic_list.keys())
        
        # Create 6 days of study plan
        for day in range(1, 7):
            day_plan = {"day": day}
            for subject in subjects:
                subtopics = subtopic_list.get(subject, [])
                if day - 1 < len(subtopics):
                    day_plan[subject] = subtopics[day - 1].get("subtopic", "")
                else:
                    day_plan[subject] = ""
            study_planner.append(day_plan)
        
        page2_data["study_planner"] = study_planner
        page2_data["subjects"] = subjects

        # Frequent Mistake Cards (highest citation count per subject)
        frequent_mistakes = []
        for subject, subtopics in subtopic_list.items():
            if subtopics:
                # Find subtopic with highest citation count
                max_subtopic = max(subtopics, key=lambda x: len(x.get("citations", [])))
                frequent_mistakes.append({
                    "subject": subject,
                    "subtopic": max_subtopic.get("subtopic", ""),
                    "frequency": len(max_subtopic.get("citations", []))
                })
        
        page2_data["frequent_mistakes"] = frequent_mistakes

        # Class vs You Analysis
        class_vs_student = current_report.class_vs_student or []
        page2_data["class_vs_you"] = class_vs_student

        # Chapter Word Cloud (based on lowest accuracy chapters with NEET weights)
        from exam.utils.chapter_cloud import get_chapter_word_cloud
        word_cloud_data = get_chapter_word_cloud(student_id, class_id, test_num)
        page2_data["previous_year_topics"] = word_cloud_data

        # Return combined data
        return Response({
            "test_num": test_num,
            "available_tests": available_tests,
            "page1": page1_data,
            "page2": page2_data
        })

    except Exception as e:
        logger.exception(f"Error in get_student_report_card: {str(e)}")
        sentry_sdk.capture_exception(e)
        return Response({"error": str(e)}, status=500)