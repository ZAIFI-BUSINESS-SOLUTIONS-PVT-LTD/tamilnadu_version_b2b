"""
PDF Generation Trigger Service for Backend Integration

This service provides functions to trigger PDF generation from the pdf_service
after test processing completion.
"""

import requests
import logging
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
            
            payload = {
                'user_id': user_id,
                'user_type': user_type,
                'class_id': class_id,
                'test_id': test_id,
                'scope': 'report:read',
                'exp': datetime.utcnow() + timedelta(minutes=10),  # 10 minute expiry
                'iat': datetime.utcnow(),
                'iss': 'inzighted-backend'
            }
            
            # Add specific ID fields based on user type
            if user_type == 'student':
                payload['student_id'] = user_id
            elif user_type == 'teacher':
                payload['teacher_id'] = user_id
                payload['educator_id'] = user_id  # Alternative field name
            
            secret_key = getattr(settings, 'SECRET_KEY', 'fallback-secret')
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            logger.debug(f"Generated report token for {user_type} {user_id}")
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
                timeout=30
            )
            
            if response.status_code == 202:
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
def trigger_teacher_pdf_generation(self, teacher_id: str, test_id: str, class_id: str):
    """Async task to trigger teacher PDF generation"""
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
    
    # Trigger student PDFs
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
    
    # Trigger teacher PDFs if provided
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