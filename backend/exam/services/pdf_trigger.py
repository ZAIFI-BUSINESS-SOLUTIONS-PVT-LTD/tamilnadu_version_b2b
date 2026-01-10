"""
PDF Generation Trigger Service for Backend Integration

This service provides functions to trigger PDF generation from the pdf_service
after test processing completion.
"""

import requests
import logging
import time
import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django.contrib.auth.models import User
from celery import shared_task
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class PDFTriggerService:
    """Service to trigger PDF generation in the pdf_service"""
    
    def __init__(self):
        self.pdf_service_url = getattr(settings, 'PDF_SERVICE_URL', 'http://localhost:8080')
        self.internal_token = getattr(settings, 'PDF_SERVICE_INTERNAL_TOKEN', 'changeme-internal-token')
        self.default_origin = getattr(settings, 'DEFAULT_FRONTEND_ORIGIN', 'https://tamilnadu.inzighted.com')
    
    def generate_report_token(self, user_id: str, user_type: str, class_id: str, test_id: str) -> Optional[str]:
        """
        Generate a short-lived JWT token for PDF service to use when fetching data
        
        Args:
            user_id: Student or teacher ID
            user_type: 'student' or 'teacher'
            class_id: Class identifier
            test_id: Test identifier
            
        Returns:
            JWT token string or None if generation fails
        """
        try:
            import jwt
            from django.conf import settings
            from exam.models.educator import Educator
            
            # The /report endpoint uses educator endpoints, so we need to authenticate as an educator
            # who has access to this student, not as the student themselves
            if user_type == 'student':
                # Look up an educator for this class
                educator = Educator.objects.filter(class_id=class_id).first()
                if not educator:
                    logger.error(f"No educator found for class {class_id}")
                    return None
                
                # Generate token as the educator
                payload = {
                    'email': educator.email,  # Required by UniversalJWTAuthentication
                    'role': 'educator',  # Must be educator to access educator endpoints
                    'educator_id': str(educator.id),
                    'class_id': class_id,
                    'test_id': test_id,
                    'scope': 'report:read',
                    'exp': datetime.utcnow() + timedelta(minutes=10),
                    'iat': datetime.utcnow(),
                    'iss': 'inzighted-backend'
                }
                logger.debug(f"Generated report token for student {user_id} as educator {educator.email} (class {class_id})")
            
            elif user_type == 'teacher' or user_type == 'educator':
                # For teacher reports, authenticate as that teacher
                payload = {
                    'email': user_id,
                    'role': 'educator',
                    'educator_id': user_id,
                    'class_id': class_id,
                    'test_id': test_id,
                    'scope': 'report:read',
                    'exp': datetime.utcnow() + timedelta(minutes=10),
                    'iat': datetime.utcnow(),
                    'iss': 'inzighted-backend'
                }
                logger.debug(f"Generated report token for educator {user_id}")
            else:
                logger.error(f"Invalid user_type: {user_type}")
                return None
            
            secret_key = getattr(settings, 'SECRET_KEY', 'fallback-secret')
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            return token
            
        except Exception as e:
            logger.error(f"Failed to generate report token: {e}")
            return None
    
    def trigger_pdf_generation(
        self, 
        test_id: str, 
        class_id: str, 
        report_type: str,
        student_id: Optional[str] = None,
        teacher_id: Optional[str] = None,
        origin: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Trigger PDF generation in pdf_service
        
        Args:
            test_id: Test identifier
            class_id: Class identifier  
            report_type: 'student', 'teacher', or 'overall'
            student_id: Student ID (required for student reports)
            teacher_id: Teacher ID (required for teacher reports)
            origin: Frontend origin (defaults to settings)
            
        Returns:
            Dict with success status and response details
        """
        try:
            # Validate inputs
            if report_type not in ['student', 'teacher', 'overall']:
                raise ValueError(f"Invalid report_type: {report_type}")
                
            if report_type == 'student' and not student_id:
                raise ValueError("student_id required for student reports")
                
            if report_type == 'teacher' and not teacher_id:
                raise ValueError("teacher_id required for teacher reports")
            
            # Generate report token
            user_id = student_id if report_type == 'student' else teacher_id
            user_type = 'student' if report_type == 'student' else 'teacher'
            report_token = None
            
            if user_id and user_type in ['student', 'teacher']:
                report_token = self.generate_report_token(user_id, user_type, class_id, test_id)
            
            # Prepare payload
            payload = {
                'testId': test_id,
                'classId': class_id,
                'reportType': report_type,
                'origin': origin or self.default_origin
            }
            
            if student_id:
                payload['studentId'] = student_id
            if teacher_id:
                payload['teacherId'] = teacher_id
            if report_token:
                payload['reportToken'] = report_token
            
            # Make request to pdf_service
            headers = {
                'X-Service-Auth': f'Bearer {self.internal_token}',
                'Content-Type': 'application/json'
            }
            
            url = f"{self.pdf_service_url}/internal/trigger-generate-pdf"
            
            logger.info(f"Triggering PDF generation: {report_type} report for test {test_id}, class {class_id}")
            
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=150
            )
            
            # Accept 202 (accepted) or 200 (completed) as success
            if response.status_code in (202, 200):
                result = response.json()
                logger.info(f"PDF generation triggered successfully: {result}")
                return {
                    'success': True,
                    'message': 'PDF generation triggered',
                    'data': result
                }
            else:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
                logger.error(f"PDF generation trigger failed: {response.status_code} - {error_data}")
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}",
                    'details': error_data
                }
                
        except Exception as e:
            logger.error(f"PDF generation trigger error: {e}")
            return {
                'success': False,
                'error': str(e)
            }


# Celery tasks for async PDF generation
@shared_task(bind=True)
def trigger_student_pdf_generation(self, student_id: str, test_id: str, class_id: str):
    """Async task to trigger student PDF generation"""
    service = PDFTriggerService()
    result = service.trigger_pdf_generation(
        test_id=test_id,
        class_id=class_id,
        report_type='student',
        student_id=student_id
    )
    
    if not result['success']:
        logger.error(f"Student PDF generation failed: {result}")
        # Could retry or alert here
    
    return result

@shared_task(bind=True)
def trigger_teacher_pdf_generation(self, teacher_id: str, test_id: str, class_id: str, previous_results=None):
    """
    Async task to trigger teacher PDF generation.
    
    Args:
        teacher_id: Educator ID
        test_id: Test number
        class_id: Class identifier
        previous_results: Optional results from previous chord tasks (ignored)
    """
    service = PDFTriggerService()
    result = service.trigger_pdf_generation(
        test_id=test_id,
        class_id=class_id,
        report_type='teacher',
        teacher_id=teacher_id
    )
    
    if not result['success']:
        logger.error(f"Teacher PDF generation failed: {result}")
    
    return result

@shared_task(bind=True)
def trigger_bulk_pdf_generation(self, test_id: str, class_id: str, student_ids: list, teacher_ids: list = None):
    """Async task to trigger bulk PDF generation for a test completion"""
    service = PDFTriggerService()
    results = []
    # Helper: check S3 existence for deterministic keys
    def _s3_head_exists(s3_key: str) -> bool:
        aws_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        aws_secret = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        aws_bucket = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
        aws_region = getattr(settings, 'AWS_S3_REGION_NAME', None) or None

        if not (aws_key and aws_secret and aws_bucket):
            # No S3 configured — cannot verify existence
            return False

        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region
        )

        try:
            s3.head_object(Bucket=aws_bucket, Key=s3_key)
            return True
        except ClientError as e:
            if e.response.get('Error', {}).get('Code') in ('404', 'NotFound'):
                return False
            # For other errors, log and return False
            logger.warn(f"S3 head_object failed for {s3_key}: {e}")
            return False


    # Trigger student PDFs sequentially and wait for S3 presence before next
    for student_id in student_ids:
        result = service.trigger_pdf_generation(
            test_id=test_id,
            class_id=class_id,
            report_type='student',
            student_id=student_id
        )

        results.append({
            'type': 'student',
            'id': student_id,
            'result': result
        })

        # If trigger succeeded, attempt to verify S3 upload before continuing
        expected_s3_key = None
        if result.get('success'):
            data = result.get('data') or {}
            expected_s3_key = data.get('s3Key')

        # Fallback deterministic key if pdf_service didn't return s3Key
        if not expected_s3_key:
            sanitized_class = str(class_id or 'unknown').replace('/', '_')
            # Format testId as "Test_N" if it's just a number
            formatted_test = f"Test_{test_id}" if str(test_id).isdigit() else str(test_id)
            sanitized_test = formatted_test.replace('/', '_').replace(' ', '_')
            expected_s3_key = f"reports/{sanitized_class}/{sanitized_test}/students/{student_id}.pdf"

        # Poll S3 for the object (max wait 300s)
        max_wait = 300
        poll_interval = 5
        waited = 0
        found = False
        while waited < max_wait:
            if _s3_head_exists(expected_s3_key):
                found = True
                logger.info(f"Confirmed S3 object exists: {expected_s3_key}")
                break
            time.sleep(poll_interval)
            waited += poll_interval

        if not found:
            logger.warning(f"Timed out waiting for S3 object {expected_s3_key} after {max_wait}s")
    
    # Trigger teacher PDFs if provided (sequential)
    if teacher_ids:
        for teacher_id in teacher_ids:
            result = service.trigger_pdf_generation(
                test_id=test_id,
                class_id=class_id,
                report_type='teacher',
                teacher_id=teacher_id
            )
            results.append({
                'type': 'teacher',
                'id': teacher_id,
                'result': result
            })

            # For teacher PDFs, if s3Key returned verify it exists (similar to students)
            expected_s3_key = None
            if result.get('success'):
                data = result.get('data') or {}
                expected_s3_key = data.get('s3Key')

            if not expected_s3_key:
                sanitized_class = str(class_id or 'unknown').replace('/', '_')
                # Format testId as "Test_N" if it's just a number
                formatted_test = f"Test_{test_id}" if str(test_id).isdigit() else str(test_id)
                sanitized_test = formatted_test.replace('/', '_').replace(' ', '_')
                expected_s3_key = f"reports/{sanitized_class}/{sanitized_test}/teacher_{teacher_id}.pdf"

            max_wait = 300
            poll_interval = 5
            waited = 0
            found = False
            while waited < max_wait:
                if _s3_head_exists(expected_s3_key):
                    found = True
                    logger.info(f"Confirmed S3 object exists: {expected_s3_key}")
                    break
                time.sleep(poll_interval)
                waited += poll_interval

            if not found:
                logger.warning(f"Timed out waiting for S3 object {expected_s3_key} after {max_wait}s")
    
    success_count = sum(1 for r in results if r['result']['success'])
    total_count = len(results)
    
    logger.info(f"Bulk PDF generation completed: {success_count}/{total_count} successful")
    
    return {
        'success': success_count == total_count,
        'results': results,
        'summary': f"{success_count}/{total_count} PDFs triggered successfully"
    }


# Example usage in your test processing completion handler
def on_test_processing_complete(test_id: str, class_id: str, student_ids: list, teacher_ids: list = None):
    """
    Call this function when educator dashboard upload/test processing is completed
    
    Args:
        test_id: The completed test ID
        class_id: The class ID
        student_ids: List of student IDs who took the test
        teacher_ids: List of teacher IDs who should get teacher reports (optional)
    """
    try:
        # Trigger async PDF generation for all students and teachers
        task = trigger_bulk_pdf_generation.delay(
            test_id=test_id,
            class_id=class_id,
            student_ids=student_ids,
            teacher_ids=teacher_ids or []
        )
        
        logger.info(f"Queued bulk PDF generation task {task.id} for test {test_id}, class {class_id}")
        return task.id
        
    except Exception as e:
        logger.error(f"Failed to queue PDF generation: {e}")
        return None


# Integration example for your existing test processing code
def integrate_with_existing_upload_handler():
    """
    Example of how to integrate this with your existing test upload/processing code.
    
    Add this call at the end of your test processing pipeline:
    """
    
    # Example: After your educator dashboard data is processed and saved
    # 
    # def process_educator_upload(uploaded_data):
    #     # ... existing processing logic ...
    #     
    #     # Extract necessary IDs from your processed data
    #     test_id = uploaded_data.get('test_id')
    #     class_id = uploaded_data.get('class_id') 
    #     student_ids = [student['student_id'] for student in uploaded_data.get('students', [])]
    #     teacher_ids = [uploaded_data.get('teacher_id')] if uploaded_data.get('teacher_id') else []
    #     
    #     # Trigger PDF generation
    #     task_id = on_test_processing_complete(
    #         test_id=test_id,
    #         class_id=class_id,
    #         student_ids=student_ids,
    #         teacher_ids=teacher_ids
    #     )
    #     
    #     if task_id:
    #         logger.info(f"PDF generation queued with task ID: {task_id}")
    #     else:
    #         logger.warning("Failed to queue PDF generation")
    #
    #     return processed_data
    
    pass