from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from exam.models.overview import Overview
from exam.models.performance import Performance
import json
from rest_framework.permissions import IsAuthenticated
from exam.models.student import Student
from exam.models.swot import SWOT
from django.http import JsonResponse
from exam.models.educator import Educator

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_details(request):
    try:
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()
        name=student.name
        class_id=student.class_id
        inst = Educator.objects.filter(class_id=class_id).first()
        if inst:
            inst_name = inst.name
        else:
            inst_name = None
        return JsonResponse({'name': name, "student_id": student_id, "class_id":class_id, "inst": inst_name}, status=200)

    except Exception as e:
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

        

        performanceTrendDataMapping = json.loads(metric_dict.get('PT', '[]'))
        subjectWiseDataMapping = json.loads(metric_dict.get('SA', '[]'))


        return Response({
            "summaryCardsData": summaryCardsData,
            "performanceTrendDataMapping": performanceTrendDataMapping,
            "subjectWiseDataMapping": subjectWiseDataMapping,
            "keyInsightsData": keyInsightsData
        })
    except Exception as e:
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
        # Filter records using test_num and student/class info
        class_id = student.class_id
        record = SWOT.objects.filter(
            user_id=student_id,
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
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_swot_tests(request):
    student_id = request.user.student_id
    tests = SWOT.objects.filter(user_id=student_id).values_list('test_num', flat=True).distinct()
    return Response({"available_tests": list(tests)})