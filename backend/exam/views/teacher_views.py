from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from exam.models import Teacher, Educator
import json
import re


def parse_test_range(test_range_str):
    """
    Parse test range string into a list of integers.
    Examples:
      "1,2,3" -> [1, 2, 3]
      "1-5" -> [1, 2, 3, 4, 5]
      "1,3-5,7" -> [1, 3, 4, 5, 7]
    """
    if not test_range_str or not isinstance(test_range_str, str):
        return None
    
    test_range_str = test_range_str.strip()
    if not test_range_str:
        return None
    
    result = []
    parts = test_range_str.split(',')
    
    for part in parts:
        part = part.strip()
        if '-' in part:
            # Handle range like "1-5"
            try:
                start, end = part.split('-')
                start, end = int(start.strip()), int(end.strip())
                result.extend(range(start, end + 1))
            except (ValueError, AttributeError):
                continue
        else:
            # Handle single number
            try:
                result.append(int(part))
            except ValueError:
                continue
    
    return sorted(list(set(result))) if result else None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_teacher(request):
    """
    Create a new teacher for a class and subject.
    Expects: class_id, subject, teacher_name, email (optional), phone_number (optional)
    """
    try:
        data = request.data
        
        # Validate required fields
        class_id = data.get('class_id')
        subject = data.get('subject')
        teacher_name = data.get('teacher_name')
        
        if not all([class_id, subject, teacher_name]):
            return JsonResponse({
                'error': 'class_id, subject, and teacher_name are required'
            }, status=400)
        
        # Parse test_range string into array
        test_range_str = data.get('test_range', None)
        test_range_array = parse_test_range(test_range_str)
        
        # Create teacher
        teacher = Teacher.objects.create(
            class_id=class_id,
            subject=subject,
            teacher_name=teacher_name,
            email=data.get('email', None),
            phone_number=data.get('phone_number', None),
            test_range=test_range_array
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Teacher added successfully',
            'data': {
                'id': teacher.id,
                'class_id': teacher.class_id,
                'subject': teacher.subject,
                'teacher_name': teacher.teacher_name,
                'email': teacher.email,
                'phone_number': teacher.phone_number,
                'test_range': ','.join(map(str, teacher.test_range)) if teacher.test_range else None,
                'created_at': teacher.created_at.isoformat(),
            }
        }, status=201)
        
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to create teacher: {str(e)}'
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_teachers(request, class_id):
    """
    List all teachers for a specific class.
    URL: /api/classes/<class_id>/teachers/
    """
    try:
        teachers = Teacher.objects.filter(class_id=class_id).order_by('subject', 'teacher_name')
        
        teachers_data = [{
            'id': teacher.id,
            'class_id': teacher.class_id,
            'subject': teacher.subject,
            'teacher_name': teacher.teacher_name,
            'email': teacher.email,
            'phone_number': teacher.phone_number,
            'test_range': ','.join(map(str, teacher.test_range)) if teacher.test_range else None,
            'created_at': teacher.created_at.isoformat(),
            'updated_at': teacher.updated_at.isoformat(),
        } for teacher in teachers]
        
        return JsonResponse({
            'success': True,
            'count': len(teachers_data),
            'data': teachers_data
        }, status=200)
        
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to fetch teachers: {str(e)}'
        }, status=500)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_teacher(request, teacher_id):
    """
    Update teacher details (email, phone_number, test_range, etc.)
    URL: /api/teachers/<teacher_id>/
    """
    try:
        teacher = Teacher.objects.get(id=teacher_id)
        data = request.data
        
        # Update fields if provided
        if 'teacher_name' in data:
            teacher.teacher_name = data['teacher_name']
        if 'subject' in data:
            teacher.subject = data['subject']
        if 'email' in data:
            teacher.email = data['email'] or None
        if 'phone_number' in data:
            teacher.phone_number = data['phone_number'] or None
        if 'test_range' in data:
            test_range_str = data['test_range']
            teacher.test_range = parse_test_range(test_range_str)
        
        teacher.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Teacher updated successfully',
            'data': {
                'id': teacher.id,
                'class_id': teacher.class_id,
                'subject': teacher.subject,
                'teacher_name': teacher.teacher_name,
                'email': teacher.email,
                'phone_number': teacher.phone_number,
                'test_range': ','.join(map(str, teacher.test_range)) if teacher.test_range else None,
                'updated_at': teacher.updated_at.isoformat(),
            }
        }, status=200)
        
    except Teacher.DoesNotExist:
        return JsonResponse({
            'error': 'Teacher not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to update teacher: {str(e)}'
        }, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_teacher(request, teacher_id):
    """
    Delete a teacher record.
    URL: /api/teachers/<teacher_id>/
    """
    try:
        teacher = Teacher.objects.get(id=teacher_id)
        teacher_name = teacher.teacher_name
        teacher.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'Teacher {teacher_name} deleted successfully'
        }, status=200)
        
    except Teacher.DoesNotExist:
        return JsonResponse({
            'error': 'Teacher not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': f'Failed to delete teacher: {str(e)}'
        }, status=500)
