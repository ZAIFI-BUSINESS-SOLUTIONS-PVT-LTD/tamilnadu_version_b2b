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
from exam.models.test_metadata import TestMetadata
from exam.models.manager import Manager
import sentry_sdk

logger = logging.getLogger(__name__)


class WhatsAppConfig:
    """Configuration for WhatsApp Business API"""
    
    ENABLED = os.getenv('WHATSAPP_ENABLED', 'false').lower() in ('true', '1', 'yes')
    TOKEN = os.getenv('WHATSAPP_TOKEN', '')
    PHONE_ID = os.getenv('WHATSAPP_PHONE_ID', '')
    WABA_ID = os.getenv('WABA_ID', '')  # WhatsApp Business Account ID (optional, for record-keeping)
    API_VERSION = os.getenv('WHATSAPP_API_VERSION', 'v22.0')
    API_BASE = f"https://graph.facebook.com/{API_VERSION}"
    
    # Template configuration
    TEMPLATE_NAME = os.getenv('WHATSAPP_TEMPLATE_NAME', 'results_update')
    # Dashboard URL to include in template parameters
    DASHBOARD_URL = os.getenv('WHATSAPP_DASHBOARD_URL', 'https://web.inzighted.com/auth')
    TEMPLATE_LANGUAGE = os.getenv('WHATSAPP_TEMPLATE_LANGUAGE', 'en_US')
    
    @classmethod
    def is_configured(cls) -> bool:
        """Check if WhatsApp is properly configured"""
        return cls.ENABLED and bool(cls.TOKEN) and bool(cls.PHONE_ID)
    
    @classmethod
    def validate_config(cls) -> tuple[bool, list[str]]:
        """Validate WhatsApp configuration and return detailed errors.
        
        Returns:
            tuple: (is_valid: bool, errors: list[str])
        """
        errors = []
        
        if not cls.ENABLED:
            return True, []  # Not enabled, skip validation
        
        if not cls.TOKEN:
            errors.append('WHATSAPP_TOKEN is missing')
        elif len(cls.TOKEN) < 50:
            errors.append('WHATSAPP_TOKEN appears invalid (too short)')
        
        if not cls.PHONE_ID:
            errors.append('WHATSAPP_PHONE_ID is missing')
        elif not cls.PHONE_ID.isdigit():
            errors.append('WHATSAPP_PHONE_ID must be numeric')
        
        if cls.WABA_ID and not cls.WABA_ID.isdigit():
            errors.append('WABA_ID should be numeric if provided')
        
        return len(errors) == 0, errors
    
    @classmethod
    def get_masked_token(cls) -> str:
        """Return masked token for safe logging."""
        if not cls.TOKEN:
            return 'Not Set'
        if len(cls.TOKEN) < 20:
            return '***'
        return f"{cls.TOKEN[:8]}...{cls.TOKEN[-4:]}"


def format_phone_number(phone: str) -> str:
    """
    Format phone number to E.164 format for WhatsApp.
    Ensures proper format like +919876543210
    
    Args:
        phone: Phone number in any format
        
    Returns:
        Formatted phone number with + prefix
        
    Raises:
        ValueError: If phone number is invalid
    """
    if not phone or not isinstance(phone, str):
        raise ValueError('Phone number must be a non-empty string')

    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone))

    # Validate minimum length (at least 10 digits for most countries)
    if len(digits) < 10:
        raise ValueError(f'Phone number too short: {phone}')

    # Validate maximum length (E.164 allows max 15 digits)
    if len(digits) > 15:
        raise ValueError(f'Phone number too long: {phone}')

    # If original string contained a leading '+', respect country code but rebuild
    # the returned value from the cleaned digits to ensure E.164 formatting.
    if phone.strip().startswith('+'):
        return f'+{digits}'

    # If digits already start with country code (e.g., '91...'), keep it.
    if digits.startswith('91'):
        return f'+{digits}'

    # Default to India country code if none provided
    return f'+91{digits}'


def build_whatsapp_payload(phone_number: str, class_id: str, test_num: int, educator_name: str, test_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Build WhatsApp API payload for test completion notification.
    Uses the configured template (default 'results_update') and passes required parameters.
    TODO: Replace with custom approved template once available.
    
    Args:
        phone_number: Recipient phone in E.164 format
        class_id: Class identifier
        test_num: Test number
        educator_name: Name of the educator
        
    Returns:
        Dictionary payload for WhatsApp API
    """
    # Prepare template parameters with validation (no empty/None values allowed)
    # Parameter order for `results_update`: educator name, test name, dashboard URL
    
    # Ensure educator_name is not empty (fallback to class_id or "Educator")
    safe_educator_name = (educator_name or "").strip() or class_id or "Educator"
    
    # Build test name - prefer passed test_name, else construct from test_num
    if not test_name:
        test_name = f"Test {test_num}" if test_num is not None else (class_id or "Assessment")
    
    # Ensure dashboard URL is not empty
    dashboard_url = WhatsAppConfig.DASHBOARD_URL or "https://web.inzighted.com/auth"

    components = [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": safe_educator_name},
                {"type": "text", "text": test_name},
                {"type": "text", "text": dashboard_url},
            ]
        }
    ]

    return {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "template",
        "template": {
            "name": WhatsAppConfig.TEMPLATE_NAME,
            "language": {
                "code": WhatsAppConfig.TEMPLATE_LANGUAGE
            },
            "components": components
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
    # Validate configuration
    is_valid, config_errors = WhatsAppConfig.validate_config()
    if not is_valid:
        error_msg = f"WhatsApp configuration invalid: {', '.join(config_errors)}"
        logger.error(f"❌ {error_msg}")
        return {
            'success': False,
            'error': error_msg,
            'response_code': None,
            'response_body': None
        }
    
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
    
    # Log request (without sensitive data)
    masked_token = WhatsAppConfig.get_masked_token()
    logger.info(f"📤 Sending WhatsApp to {phone_number} via {url.split('graph.facebook.com')[1]} (token={masked_token})")
    try:
        # Debug: log full payload (safe to log - no secrets). Keep at DEBUG level to avoid noise.
        import json as _json
        logger.debug("WhatsApp payload: %s", _json.dumps(payload, ensure_ascii=False))
    except Exception:
        logger.debug("WhatsApp payload: <unserializable>")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)

        success = response.status_code in (200, 201)

        # Try to get response body safely
        resp_text = None
        try:
            resp_text = response.text
        except Exception:
            resp_text = '<unreadable response body>'

        # Log full response at DEBUG, and concise info at INFO/ERROR
        logger.debug("WhatsApp API response code=%s body=%s", response.status_code, resp_text)

        if success:
            logger.info(f"✅ WhatsApp API success: {response.status_code}")
        else:
            logger.error(f"❌ WhatsApp API error {response.status_code}: {resp_text}")

        return {
            'success': success,
            'response_code': response.status_code,
            'response_body': resp_text,
            'error': None if success else f"HTTP {response.status_code}: {resp_text}"
        }
        
    except requests.exceptions.Timeout:
        logger.error(f"❌ WhatsApp API timeout for {phone_number}")
        return {
            'success': False,
            'response_code': None,
            'response_body': None,
            'error': 'Request timeout after 10s'
        }
    except requests.exceptions.ConnectionError as e:
        logger.error(f"❌ WhatsApp API connection error: {e}")
        return {
            'success': False,
            'response_code': None,
            'response_body': None,
            'error': f'Connection failed: {str(e)}'
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ WhatsApp API request error: {e}")
        return {
            'success': False,
            'response_code': None,
            'response_body': None,
            'error': f'Request failed: {str(e)}'
        }
    except Exception as e:
        logger.exception(f"❌ Unexpected error sending WhatsApp: {e}")
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
        
        # Check WhatsApp activation status (new requirement for explicit opt-in)
        educator_opted_in = getattr(educator, 'whatsapp_opt_in', False)
        educator_activated = getattr(educator, 'whatsapp_activated', False)
        
        # Prepare educator phone (don't abort early; managers should still be notified)
        formatted_phone = None
        if getattr(educator, 'phone_number', None):
            try:
                formatted_phone = format_phone_number(educator.phone_number)
            except ValueError as ve:
                logger.error(f"❌ Invalid phone number for {educator.email}: {ve}")
                formatted_phone = None
        
        # Check for existing notification (idempotency)
        existing = NotificationLog.objects.filter(
            class_id=class_id,
            test_num=test_num,
            notification_type='TEST_COMPLETE'
        ).first()

        # If already sent to educator, we still want to attempt notifying managers
        if existing and existing.sent:
            notification_log = existing
            logger.info(f"✅ Notification already sent for {class_id} Test {test_num} (educator)")
            # we'll still attempt manager notifications below
        else:
            # Create or update notification log for educator
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
        
        # Try to get a friendly test name from TestMetadata
        test_name = None
        try:
            tm = TestMetadata.objects.filter(class_id=class_id, test_num=test_num).first()
            if tm and getattr(tm, 'test_name', None):
                test_name = tm.test_name
        except Exception:
            logger.debug('Could not fetch TestMetadata for test_name; falling back to default')

        # Build payload only if we have a formatted phone
        payload = None
        if formatted_phone:
            payload = build_whatsapp_payload(
                phone_number=formatted_phone,
                class_id=class_id,
                test_num=test_num,
                educator_name=educator.name,
                test_name=test_name
            )

        notification_log.phone_number = formatted_phone
        if payload:
            notification_log.payload = payload
        notification_log.save()

        # Send WhatsApp message to educator if not already sent and phone available
        send_results = []
        educator_failed = False
        educator_error = None

        if formatted_phone and not (notification_log.sent and notification_log.educator):
            # Check if educator has opted in and activated WhatsApp
            if not educator_opted_in:
                logger.info(f"ℹ️ Educator {educator.email} has not opted in to WhatsApp notifications; skipping send")
                send_results.append({'recipient': 'educator', 'id': educator.id, 'phone': formatted_phone, 'success': False, 'skipped': True, 'reason': 'not opted in'})
            elif not educator_activated:
                logger.info(f"ℹ️ Educator {educator.email} has opted in but not activated WhatsApp yet; skipping send")
                send_results.append({'recipient': 'educator', 'id': educator.id, 'phone': formatted_phone, 'success': False, 'skipped': True, 'reason': 'not activated - awaiting first message'})
            else:
                logger.info(f"📤 Sending WhatsApp to educator {formatted_phone} for {class_id} Test {test_num}")
                result = send_whatsapp_message(formatted_phone, payload)

                # Update notification log with educator result
                notification_log.response_code = result.get('response_code')
                notification_log.response_body = result.get('response_body')
                notification_log.error = result.get('error')

                if result.get('success'):
                    notification_log.sent = True
                    notification_log.sent_at = now()
                    notification_log.save()
                    logger.info(f"✅ WhatsApp sent successfully to {educator.email} ({formatted_phone})")
                    send_results.append({'recipient': 'educator', 'id': educator.id, 'phone': formatted_phone, 'success': True})
                else:
                    notification_log.save()
                    error_msg = result.get('error', 'Unknown error')
                    logger.error(f"❌ WhatsApp send failed (educator): {error_msg}")
                    send_results.append({'recipient': 'educator', 'id': educator.id, 'phone': formatted_phone, 'success': False, 'error': error_msg})
                    educator_failed = True
                    educator_error = error_msg
        else:
            # No phone or already sent: still proceed to managers
            if not formatted_phone:
                logger.info(f"ℹ️ Educator {educator.email} has no valid phone; skipping educator send and notifying managers")
                send_results.append({'recipient': 'educator', 'id': educator.id, 'phone': None, 'success': False, 'skipped': True, 'reason': 'no phone or invalid'})
            else:
                logger.info(f"ℹ️ Skipping educator send; already recorded as sent in NotificationLog {notification_log.id}")
                send_results.append({'recipient': 'educator', 'id': educator.id, 'phone': formatted_phone, 'success': True, 'skipped': True})

        # Now find Managers for the same institution and notify them if they have phones
        try:
            managers = Manager.objects.filter(institution=educator.institution)
            manager_reports = []
            for manager in managers:
                # Look for common phone fields; skip if none
                mgr_phone = getattr(manager, 'phone_number', None) or getattr(manager, 'phone', None)
                if not mgr_phone:
                    logger.debug(f"No phone number for manager {manager.email}; skipping WhatsApp")
                    manager_reports.append({'manager_id': manager.id, 'phone': None, 'sent': False, 'reason': 'no phone'})
                    continue

                try:
                    mgr_formatted = format_phone_number(mgr_phone)
                except ValueError as ve:
                    logger.error(f"Invalid manager phone for {manager.email}: {ve}")
                    manager_reports.append({'manager_id': manager.id, 'phone': mgr_phone, 'sent': False, 'reason': str(ve)})
                    continue

                # Check manager opt-in and activation status
                mgr_opted_in = getattr(manager, 'whatsapp_opt_in', False)
                mgr_activated = getattr(manager, 'whatsapp_activated', False)
                
                if not mgr_opted_in:
                    logger.info(f"ℹ️ Manager {manager.email} has not opted in to WhatsApp notifications; skipping")
                    manager_reports.append({'manager_id': manager.id, 'phone': mgr_formatted, 'sent': False, 'reason': 'not opted in'})
                    continue
                
                if not mgr_activated:
                    logger.info(f"ℹ️ Manager {manager.email} has opted in but not activated WhatsApp yet; skipping")
                    manager_reports.append({'manager_id': manager.id, 'phone': mgr_formatted, 'sent': False, 'reason': 'not activated'})
                    continue

                # Build manager-specific payload (use manager's name as educator_name variable)
                mgr_payload = build_whatsapp_payload(
                    phone_number=mgr_formatted,
                    class_id=class_id,
                    test_num=test_num,
                    educator_name=manager.name,
                    test_name=test_name
                )

                # Send payload to manager
                logger.info(f"📤 Sending WhatsApp to manager {manager.email} ({mgr_formatted}) for {class_id} Test {test_num}")
                mgr_result = send_whatsapp_message(mgr_formatted, mgr_payload)

                if mgr_result.get('success'):
                    logger.info(f"✅ WhatsApp sent to manager {manager.email} ({mgr_formatted})")
                    manager_reports.append({'manager_id': manager.id, 'phone': mgr_formatted, 'sent': True})
                else:
                    logger.error(f"❌ Failed sending WhatsApp to manager {manager.email}: {mgr_result.get('error')}")
                    manager_reports.append({'manager_id': manager.id, 'phone': mgr_formatted, 'sent': False, 'error': mgr_result.get('error')})

            # Append manager reports to notification log response_body for traceability
            try:
                existing_body = notification_log.response_body or ''
                import json
                appended = {'managers': manager_reports}
                # store a JSON object as text (safe to append)
                combined = {
                    'educator_result': send_results,
                    'manager_results': manager_reports
                }
                notification_log.response_body = json.dumps(combined)
                notification_log.save()
            except Exception:
                logger.exception('Failed updating NotificationLog with manager reports')

        except Exception as mgr_exc:
            logger.exception(f"Error while notifying managers: {mgr_exc}")

        return {'success': True, 'notification_id': notification_log.id, 'details': send_results}
    
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
