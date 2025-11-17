from django.http import JsonResponse
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from exam.authentication import UniversalJWTAuthentication
from exam.models.educator import Educator
from exam.models.test import Test
from exam.models.test_metadata import TestMetadata
from exam.services.process_test_data import process_test_data
from datetime import datetime
import os
import magic
import logging

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads/"


@api_view(['POST'])
@authentication_classes([UniversalJWTAuthentication])
@permission_classes([IsAuthenticated])
def upload_test(request):
    try:
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()

        if not educator:
            return JsonResponse({'error': 'Educator not found'}, status=404)

        class_id = educator.class_id
        if not class_id:
            return JsonResponse({'error': 'Educator has no assigned class'}, status=400)

        question_paper = request.FILES.get('question_paper')
        answer_key = request.FILES.get('answer_key')
        answer_sheet = request.FILES.get('answer_sheet')

        if not (question_paper and answer_key and answer_sheet):
            return JsonResponse({'error': 'All three files are required'}, status=400)

        # Auto-generate next test_num
        last_test = Test.objects.filter(class_id=class_id).order_by('-test_num').first()
        test_num = last_test.test_num + 1 if last_test else 1
        
        # Check for optional metadata fields (pattern, subject_order, total_questions, section_counts)
        pattern = request.data.get('pattern')
        subject_order = request.data.get('subject_order')
        total_questions = request.data.get('total_questions')
        section_counts = request.data.get('section_counts')
        
        # If metadata is provided, validate and save it
        if pattern and subject_order and total_questions:
            try:
                # Parse JSON strings if they come as strings
                if isinstance(subject_order, str):
                    import json
                    subject_order = json.loads(subject_order)
                if isinstance(section_counts, str):
                    import json
                    section_counts = json.loads(section_counts)
                
                # Convert total_questions to int if it's a string
                if isinstance(total_questions, str):
                    total_questions = int(total_questions)
                
                # Validate pattern and subject_order match
                valid_subjects = {
                    'PHY_CHEM_BOT_ZOO': ['Physics', 'Chemistry', 'Botany', 'Zoology'],
                    'PHY_CHEM_BIO': ['Physics', 'Chemistry', 'Biology']
                }
                
                if pattern not in valid_subjects:
                    return JsonResponse({'error': f'Invalid pattern. Must be one of: {list(valid_subjects.keys())}'}, status=400)
                
                expected_subjects = set(valid_subjects[pattern])
                provided_subjects = set(subject_order)
                
                if expected_subjects != provided_subjects:
                    return JsonResponse({
                        'error': f'subject_order does not match pattern {pattern}. Expected: {valid_subjects[pattern]}'
                    }, status=400)
                
                # Validate section_counts if provided
                if section_counts:
                    for subject in subject_order:
                        if subject not in section_counts:
                            return JsonResponse({'error': f'Missing count for subject: {subject}'}, status=400)
                        if not isinstance(section_counts[subject], int) or section_counts[subject] <= 0:
                            return JsonResponse({'error': f'Invalid count for {subject}: must be positive integer'}, status=400)
                    
                    sum_counts = sum(section_counts.values())
                    if sum_counts != total_questions:
                        return JsonResponse({
                            'error': f'Sum of section_counts ({sum_counts}) does not match total_questions ({total_questions})'
                        }, status=400)
                
                # Create TestMetadata
                TestMetadata.objects.create(
                    class_id=class_id,
                    test_num=test_num,
                    pattern=pattern,
                    subject_order=subject_order,
                    total_questions=total_questions,
                    section_counts=section_counts
                )
                logger.info(f"Created test metadata for {class_id} Test {test_num} with pattern {pattern}")
            except Exception as metadata_error:
                logger.warning(f"Failed to save metadata: {metadata_error}. Continuing with file upload...")
                # Don't fail the entire upload if metadata save fails - just log and continue

        test_prefix = f"inzighted/uploads/{class_id}/TEST_{test_num}/"

        # Get file extensions using python-magic
        def get_extension(file_obj, default_ext):
            file_start = file_obj.read(2048)
            file_obj.seek(0)
            mime = magic.from_buffer(file_start, mime=True)
            if mime == 'text/csv':
                return '.csv'
            elif mime == 'application/vnd.ms-excel':
                return '.xls'
            elif mime == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                return '.xlsx'
            elif mime == 'application/pdf':
                return '.pdf'
            # Add more types as needed
            return default_ext

        qp_ext = os.path.splitext(question_paper.name)[1] or get_extension(question_paper, '.pdf')
        ak_ext = os.path.splitext(answer_key.name)[1] or get_extension(answer_key, '.csv')
        as_ext = os.path.splitext(answer_sheet.name)[1] or get_extension(answer_sheet, '.csv')

        question_paper_key = f"{test_prefix}qp{qp_ext}"
        answer_key_key = f"{test_prefix}ans{ak_ext}"
        answer_sheet_key = f"{test_prefix}resp{as_ext}"
        

        # Save files to S3
        default_storage.save(question_paper_key, question_paper)
        default_storage.save(answer_key_key, answer_key)
        default_storage.save(answer_sheet_key, answer_sheet)

        new_test = Test(class_id=class_id, test_num=test_num, date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        new_test.save()

        # Trigger Celery task with S3 keys
        process_test_data.delay(class_id, test_num)

        return JsonResponse({'message': f'Test {test_num} uploaded successfully!', 'test_num': test_num}, status=200)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([UniversalJWTAuthentication])
@permission_classes([IsAuthenticated])
def save_test_metadata(request):
    """
    Save or update test metadata (subject pattern, order, counts).
    If test_num is not provided, it will auto-generate the next test_num.
    Expected payload:
    {
        "class_id": "CLASS123",
        "test_num": 1,  // optional - will auto-generate if not provided
        "pattern": "PHY_CHEM_BOT_ZOO",
        "subject_order": ["Physics", "Chemistry", "Botany", "Zoology"],
        "total_questions": 180,
        "section_counts": {"Physics": 45, "Chemistry": 45, "Botany": 45, "Zoology": 45}  // optional
    }
    """
    try:
        educator_email = request.user.email
        educator = Educator.objects.filter(email=educator_email).first()
        
        if not educator:
            return JsonResponse({'error': 'Educator not found'}, status=404)
        
        # Get data from request
        class_id = request.data.get('class_id') or educator.class_id
        test_num = request.data.get('test_num')
        pattern = request.data.get('pattern')
        subject_order = request.data.get('subject_order')
        total_questions = request.data.get('total_questions')
        section_counts = request.data.get('section_counts')
        
        # Auto-generate test_num if not provided
        if not test_num:
            last_test = Test.objects.filter(class_id=class_id).order_by('-test_num').first()
            test_num = last_test.test_num + 1 if last_test else 1
        
        # Validation
        if not all([pattern, subject_order, total_questions]):
            return JsonResponse({
                'error': 'Missing required fields: pattern, subject_order, total_questions'
            }, status=400)
        
        if not isinstance(subject_order, list) or len(subject_order) == 0:
            return JsonResponse({'error': 'subject_order must be a non-empty list'}, status=400)
        
        if not isinstance(total_questions, int) or total_questions <= 0:
            return JsonResponse({'error': 'total_questions must be a positive integer'}, status=400)
        
        # Validate pattern matches subject_order
        valid_subjects = {
            'PHY_CHEM_BOT_ZOO': ['Physics', 'Chemistry', 'Botany', 'Zoology'],
            'PHY_CHEM_BIO': ['Physics', 'Chemistry', 'Biology']
        }
        
        if pattern not in valid_subjects:
            return JsonResponse({'error': f'Invalid pattern. Must be one of: {list(valid_subjects.keys())}'}, status=400)
        
        expected_subjects = set(valid_subjects[pattern])
        provided_subjects = set(subject_order)
        
        if expected_subjects != provided_subjects:
            return JsonResponse({
                'error': f'subject_order does not match pattern {pattern}. Expected: {valid_subjects[pattern]}'
            }, status=400)
        
        # Validate section_counts if provided
        if section_counts:
            if not isinstance(section_counts, dict):
                return JsonResponse({'error': 'section_counts must be a dictionary'}, status=400)
            
            # Check all subjects have counts
            for subject in subject_order:
                if subject not in section_counts:
                    return JsonResponse({'error': f'Missing count for subject: {subject}'}, status=400)
                if not isinstance(section_counts[subject], int) or section_counts[subject] <= 0:
                    return JsonResponse({'error': f'Invalid count for {subject}: must be positive integer'}, status=400)
            
            # Check sum matches total
            sum_counts = sum(section_counts.values())
            if sum_counts != total_questions:
                return JsonResponse({
                    'error': f'Sum of section_counts ({sum_counts}) does not match total_questions ({total_questions})'
                }, status=400)
        
        # Create or update metadata
        metadata, created = TestMetadata.objects.update_or_create(
            class_id=class_id,
            test_num=test_num,
            defaults={
                'pattern': pattern,
                'subject_order': subject_order,
                'total_questions': total_questions,
                'section_counts': section_counts
            }
        )
        
        logger.info(f"{'Created' if created else 'Updated'} test metadata for {class_id} Test {test_num}")
        
        return JsonResponse({
            'message': f'Test metadata {"created" if created else "updated"} successfully',
            'metadata': {
                'class_id': metadata.class_id,
                'test_num': metadata.test_num,
                'pattern': metadata.pattern,
                'subject_order': metadata.subject_order,
                'total_questions': metadata.total_questions,
                'section_counts': metadata.section_counts
            }
        }, status=201 if created else 200)
        
    except Exception as e:
        logger.error(f"Error saving test metadata: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([UniversalJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_test_metadata(request, class_id, test_num):
    """
    Retrieve test metadata for a specific test.
    """
    try:
        metadata = TestMetadata.objects.filter(class_id=class_id, test_num=test_num).first()
        
        if not metadata:
            return JsonResponse({'error': 'Test metadata not found'}, status=404)
        
        return JsonResponse({
            'metadata': {
                'class_id': metadata.class_id,
                'test_num': metadata.test_num,
                'pattern': metadata.pattern,
                'subject_order': metadata.subject_order,
                'total_questions': metadata.total_questions,
                'section_counts': metadata.section_counts,
                'subject_ranges': metadata.get_subject_ranges()
            }
        }, status=200)
        
    except Exception as e:
        logger.error(f"Error retrieving test metadata: {e}")
        return JsonResponse({'error': str(e)}, status=500)