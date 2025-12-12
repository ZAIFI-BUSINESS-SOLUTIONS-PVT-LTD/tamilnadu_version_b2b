"""
WhatsApp notification service using Facebook Graph API.
Sends test completion notifications to educators via WhatsApp Business API.
"""

import os
import requests
import logging
from typing import Optional, Dict, Any
from django.utils.timezone import now
from celery import shared_task
from exam.models.notification_log import NotificationLog
from exam.models.educator import Educator
import sentry_sdk

logger = logging.getLogger(__name__)


class WhatsAppConfig:
    """Configuration for WhatsApp Business API"""
    
    ENABLED = os.getenv('WHATSAPP_ENABLED', 'false').lower() in ('true', '1', 'yes')
    TOKEN = os.getenv('WHATSAPP_TOKEN', '')
    PHONE_ID = os.getenv('WHATSAPP_PHONE_ID', '')
    API_VERSION = os.getenv('WHATSAPP_API_VERSION', 'v22.0')
    API_BASE = f"https://graph.facebook.com/{API_VERSION}"
    
    # Template configuration
    TEMPLATE_NAME = os.getenv('WHATSAPP_TEMPLATE_NAME', 'test_completion_notification')
    TEMPLATE_LANGUAGE = os.getenv('WHATSAPP_TEMPLATE_LANGUAGE', 'en_US')
    
    @classmethod
    def is_configured(cls) -> bool:
        """Check if WhatsApp is properly configured"""
        return cls.ENABLED and bool(cls.TOKEN) and bool(cls.PHONE_ID)


def format_phone_number(phone: str) -> str:
    """
    Format phone number to E.164 format for WhatsApp.
    Ensures proper format like +919876543210
    
    Args:
        phone: Phone number in any format
        
    Returns:
        Formatted phone number with + prefix
    """
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))
    
    # If it doesn't start with country code, assume India (+91)
    if not phone.startswith('+'):
        if digits.startswith('91'):
            return f'+{digits}'
        else:
            return f'+91{digits}'
    
    return phone if phone.startswith('+') else f'+{phone}'


def build_whatsapp_payload(phone_number: str, class_id: str, test_num: int, educator_name: str) -> Dict[str, Any]:
    """
    Build WhatsApp API payload for test completion notification.
    Uses the test template 'jaspers_market_plain_text_v1' from WhatsApp test credentials.
    TODO: Replace with custom approved template once available.
    
    Args:
        phone_number: Recipient phone in E.164 format
        class_id: Class identifier
        test_num: Test number
        educator_name: Name of the educator
        
    Returns:
        Dictionary payload for WhatsApp API
    """
    # Using test template from WhatsApp Business test credentials
    # This template has no parameters (static text only)
    
    return {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "template",
        "template": {
            "name": "jaspers_market_plain_text_v1",  # Test template - replace when custom template is approved
            "language": {
                "code": "en_US"
            }
        }
    }


def send_whatsapp_message(phone_number: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send WhatsApp message via Graph API.
    
    Args:
        phone_number: Recipient phone number
        payload: Message payload
        
    Returns:
        Dict with 'success', 'response_code', 'response_body', 'error'
        
    Raises:
        Does not raise exceptions - returns error in dict
    """
    if not WhatsAppConfig.is_configured():
        return {
            'success': False,
            'error': 'WhatsApp is not configured or disabled',
            'response_code': None,
            'response_body': None
        }
    
    url = f"{WhatsAppConfig.API_BASE}/{WhatsAppConfig.PHONE_ID}/messages"
    headers = {
        'Authorization': f'Bearer {WhatsAppConfig.TOKEN}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        success = response.status_code in (200, 201)
        
        return {
            'success': success,
            'response_code': response.status_code,
            'response_body': response.text,
            'error': None if success else f"HTTP {response.status_code}: {response.text}"
        }
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'response_code': None,
            'response_body': None,
            'error': 'Request timeout'
        }
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'response_code': None,
            'response_body': None,
            'error': f'Request failed: {str(e)}'
        }
    except Exception as e:
        logger.exception(f"Unexpected error sending WhatsApp: {e}")
        return {
            'success': False,
            'response_code': None,
            'response_body': None,
            'error': f'Unexpected error: {str(e)}'
        }


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 3},
    retry_jitter=True
)
def send_whatsapp_notification(self, class_id: str, test_num: int, educator_id: Optional[int] = None):
    """
    Celery task to send WhatsApp notification to educator when test processing completes.
    Implements idempotency via NotificationLog to prevent duplicate sends.
    
    Args:
        class_id: Class identifier
        test_num: Test number
        educator_id: Educator ID (optional, will be fetched if not provided)
        
    Returns:
        Dict with success status and details
    """
    logger.info(f"📱 WhatsApp notification task started for {class_id} Test {test_num}")
    
    # Feature flag check
    if not WhatsAppConfig.is_configured():
        logger.warning("⚠️ WhatsApp notifications disabled or not configured")
        return {'success': False, 'reason': 'WhatsApp not configured'}
    
    try:
        # Get educator
        if educator_id:
            educator = Educator.objects.filter(id=educator_id).first()
        else:
            educator = Educator.objects.filter(class_id=class_id).first()
        
        if not educator:
            logger.error(f"❌ Educator not found for class {class_id}")
            return {'success': False, 'reason': 'Educator not found'}
        
        if not educator.phone_number:
            logger.warning(f"⚠️ Educator {educator.email} has no phone number configured")
            return {'success': False, 'reason': 'No phone number'}
        
        # Check for existing notification (idempotency)
        existing = NotificationLog.objects.filter(
            class_id=class_id,
            test_num=test_num,
            notification_type='TEST_COMPLETE'
        ).first()
        
        if existing and existing.sent:
            logger.info(f"✅ Notification already sent for {class_id} Test {test_num}")
            return {'success': True, 'reason': 'Already sent', 'notification_id': existing.id}
        
        # Create or update notification log
        if existing:
            notification_log = existing
            notification_log.attempts += 1
        else:
            notification_log = NotificationLog.objects.create(
                class_id=class_id,
                test_num=test_num,
                educator=educator,
                notification_type='TEST_COMPLETE',
                phone_number=educator.phone_number,
                attempts=1
            )
        
        # Format phone and build payload
        formatted_phone = format_phone_number(educator.phone_number)
        payload = build_whatsapp_payload(
            phone_number=formatted_phone,
            class_id=class_id,
            test_num=test_num,
            educator_name=educator.name
        )
        
        notification_log.phone_number = formatted_phone
        notification_log.payload = payload
        notification_log.save()
        
        # Send WhatsApp message
        logger.info(f"📤 Sending WhatsApp to {formatted_phone} for {class_id} Test {test_num}")
        result = send_whatsapp_message(formatted_phone, payload)
        
        # Update notification log with result
        notification_log.response_code = result.get('response_code')
        notification_log.response_body = result.get('response_body')
        notification_log.error = result.get('error')
        
        if result['success']:
            notification_log.sent = True
            notification_log.sent_at = now()
            notification_log.save()
            logger.info(f"✅ WhatsApp sent successfully to {educator.email} ({formatted_phone})")
            return {'success': True, 'notification_id': notification_log.id}
        else:
            notification_log.save()
            error_msg = result.get('error', 'Unknown error')
            logger.error(f"❌ WhatsApp send failed: {error_msg}")
            
            # Raise exception to trigger Celery retry
            raise Exception(f"WhatsApp API failed: {error_msg}")
    
    except Exception as e:
        logger.exception(f"❌ Error in WhatsApp notification task: {e}")
        
        # Update notification log with error if it exists
        try:
            if 'notification_log' in locals():
                notification_log.error = str(e)
                notification_log.save()
        except Exception:
            pass
        
        # Capture in Sentry
        sentry_sdk.capture_exception(e)
        
        # Re-raise for Celery retry mechanism
        raise


@shared_task
def retry_failed_notifications(class_id: Optional[str] = None, test_num: Optional[int] = None):
    """
    Admin task to retry failed notifications.
    Can be called manually or scheduled.
    
    Args:
        class_id: Optional class filter
        test_num: Optional test filter
    """
    filters = {'sent': False}
    if class_id:
        filters['class_id'] = class_id
    if test_num:
        filters['test_num'] = test_num
    
    failed_notifications = NotificationLog.objects.filter(**filters)
    
    logger.info(f"🔄 Retrying {failed_notifications.count()} failed notifications")
    
    for notification in failed_notifications:
        if notification.attempts < 5:  # Limit retry attempts
            send_whatsapp_notification.delay(
                notification.class_id,
                notification.test_num,
                notification.educator_id
            )
    
    return {'retried': failed_notifications.count()}
