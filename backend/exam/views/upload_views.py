from django.http import JsonResponse
from django.core.files.storage import default_storage
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from exam.authentication import UniversalJWTAuthentication
from exam.models.educator import Educator
from exam.models.test import Test
from exam.services.process_test_data import process_test_data
from datetime import datetime
import os
import magic


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

        last_test = Test.objects.filter(class_id=class_id).order_by('-test_num').first()
        test_num = last_test.test_num + 1 if last_test else 1

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