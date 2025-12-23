from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from exam.models.feedback import Feedback
from exam.models.student import Student
from exam.models.educator import Educator
from exam.models.manager import Manager
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_student_feedback(request):
    """
    Endpoint for students to submit feedback from their dashboard.
    Extracts student_id and class_id from authenticated user.
    
    Expected JSON payload:
    {
        "satisfaction_rate": 4,
        "need_improvement": "More practice questions needed",
        "what_you_like": "Clear explanations and good examples"
    }
    """
    try:
        # Get student info from authenticated user
        student_id = request.user.student_id
        student = Student.objects.filter(student_id=student_id).first()
        
        if not student:
            return JsonResponse({'error': 'Student not found'}, status=404)
        
        class_id = student.class_id
        feedback_value = request.data
        
        if not feedback_value or not isinstance(feedback_value, dict):
            return JsonResponse({'error': 'Invalid feedback data'}, status=400)
        
        # Add user type for easier filtering
        feedback_value['user_type'] = 'student'
        
        # Create feedback record
        feedback = Feedback.objects.create(
            user_id=student_id,
            class_id=class_id,
            feedback_value=feedback_value
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Feedback submitted successfully',
            'feedback_id': feedback.id,
            'created_at': feedback.created_at.isoformat()
        }, status=201)
        
    except Exception as e:
        logger.exception(f"Error in submit_student_feedback: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_educator_feedback(request):
    """
    Endpoint for educators to submit feedback from their dashboard.
    Extracts email and class_id from authenticated user.
    
    Expected JSON payload:
    {
        "satisfaction_rate": 5,
        "need_improvement": "Better admin tools",
        "what_you_like": "Easy student management"
    }
    """
    try:
        # Get educator info from authenticated user
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()
        
        if not educator:
            return JsonResponse({'error': 'Educator not found'}, status=404)
        
        class_id = educator.class_id
        feedback_value = request.data
        
        if not feedback_value or not isinstance(feedback_value, dict):
            return JsonResponse({'error': 'Invalid feedback data'}, status=400)
        
        # Add user type for easier filtering
        feedback_value['user_type'] = 'educator'
        
        # Create feedback record
        feedback = Feedback.objects.create(
            user_id=educator_email,
            class_id=class_id,
            feedback_value=feedback_value
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Feedback submitted successfully',
            'feedback_id': feedback.id,
            'created_at': feedback.created_at.isoformat()
        }, status=201)
        
    except Exception as e:
        logger.exception(f"Error in submit_educator_feedback: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_institution_feedback(request):
    """
    Endpoint for institutions to submit feedback from their dashboard.
    Extracts email and institution from authenticated user.
    
    Expected JSON payload:
    {
        "satisfaction_rate": 4,
        "need_improvement": "More analytics features",
        "what_you_like": "Comprehensive reporting"
    }
    """
    try:
        # Get institution info from authenticated user
        manager_email = request.user.email
        manager = Manager.objects.filter(email=manager_email).first()
        
        if not manager:
            return JsonResponse({'error': 'Manager not found'}, status=404)
        
        # For institution, use institution name as class_id
        class_id = manager.institution or "ALL"
        feedback_value = request.data
        
        if not feedback_value or not isinstance(feedback_value, dict):
            return JsonResponse({'error': 'Invalid feedback data'}, status=400)
        
        # Add user type for easier filtering
        feedback_value['user_type'] = 'institution'
        
        # Create feedback record
        feedback = Feedback.objects.create(
            user_id=manager_email,
            class_id=class_id,
            feedback_value=feedback_value
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Feedback submitted successfully',
            'feedback_id': feedback.id,
            'created_at': feedback.created_at.isoformat()
        }, status=201)
        
    except Exception as e:
        logger.exception(f"Error in submit_institution_feedback: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_feedback_history(request):
    """
    Get feedback history for the authenticated user.
    Works for student, educator, or institution based on their token.
    """
    try:
        # Determine user type and ID from token
        if hasattr(request.user, 'student_id'):
            # Student
            user_id = request.user.student_id
        elif hasattr(request.user, 'email'):
            # Educator or Manager
            user_id = request.user.email
        else:
            return JsonResponse({'error': 'Unable to identify user'}, status=400)
        
        # Get all feedback by this user
        feedbacks = Feedback.objects.filter(user_id=user_id).order_by('-created_at')
        
        # Serialize feedback data
        feedback_list = [
            {
                'id': fb.id,
                'user_id': fb.user_id,
                'class_id': fb.class_id,
                'feedback_value': fb.feedback_value,
                'created_at': fb.created_at.isoformat(),
                'updated_at': fb.updated_at.isoformat()
            }
            for fb in feedbacks
        ]
        
        return JsonResponse({
            'success': True,
            'count': len(feedback_list),
            'feedbacks': feedback_list
        }, status=200)
        
    except Exception as e:
        logger.exception(f"Error in get_my_feedback_history: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)
