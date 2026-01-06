"""
WhatsApp opt-in and activation API endpoints.
Handles opt-in consent updates and webhook for incoming messages.
"""
import os
import hmac
import hashlib
import json
import logging
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from exam.models import Educator, Manager
from exam.services.whatsapp_notification import (
    WhatsAppConfig,
    send_whatsapp_message,
    build_whatsapp_payload,
    format_phone_number
)

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP from request, handling proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_whatsapp_opt_in(request):
    """
    Update WhatsApp opt-in status for logged-in educator or manager.
    
    Expected payload:
    {
        "opt_in": true,
        "consent_text": "I agree to receive important notifications and updates on WhatsApp."
    }
    """
    try:
        user_email = request.user.email
        opt_in = request.data.get('opt_in', False)
        consent_text = request.data.get('consent_text', '')
        
        # Try to find user in Educator or Manager table
        educator = Educator.objects.filter(email=user_email).first()
        manager = Manager.objects.filter(email=user_email).first()
        
        user_obj = educator or manager
        if not user_obj:
            return Response({'error': 'User not found'}, status=404)
        
        # Update opt-in fields
        user_obj.whatsapp_opt_in = opt_in
        if opt_in:
            user_obj.whatsapp_opt_in_timestamp = timezone.now()
            user_obj.whatsapp_consent_ip = get_client_ip(request)
            user_obj.whatsapp_consent_text = consent_text
        
        user_obj.save(update_fields=[
            'whatsapp_opt_in',
            'whatsapp_opt_in_timestamp',
            'whatsapp_consent_ip',
            'whatsapp_consent_text'
        ])
        
        logger.info(f"📱 WhatsApp opt-in updated for {user_email}: {opt_in}")
        
        # Build activation link
        user_type = 'educator' if educator else 'manager'
        # Use business phone number for wa.me link (not Phone ID). Ensure only digits (no leading +)
        business_phone = os.getenv('WHATSAPP_BUSINESS_PHONE', '917984113438')
        business_phone_digits = ''.join(filter(str.isdigit, business_phone))
        activation_link = f"https://wa.me/{business_phone_digits}?text=Start%20WhatsApp%20updates%20for%20{user_type}%20{user_obj.id}"
        
        return Response({
            'success': True,
            'opt_in': opt_in,
            'activated': user_obj.whatsapp_activated,
            'activation_link': activation_link if opt_in and not user_obj.whatsapp_activated else None
        }, status=200)
        
    except Exception as e:
        logger.exception(f"❌ Error updating WhatsApp opt-in: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_whatsapp_status(request):
    """
    Get WhatsApp opt-in and activation status for logged-in user.
    
    Returns:
    {
        "opt_in": true/false/null,
        "activated": true/false,
        "phone_number": "+919876543210",
        "activation_link": "https://wa.me/..."
    }
    """
    try:
        user_email = request.user.email
        
        # Try to find user in Educator or Manager table
        educator = Educator.objects.filter(email=user_email).first()
        manager = Manager.objects.filter(email=user_email).first()
        
        user_obj = educator or manager
        if not user_obj:
            return Response({'error': 'User not found'}, status=404)
        
        user_type = 'educator' if educator else 'manager'
        
        # Build activation link if opted in but not activated
        activation_link = None
        if user_obj.whatsapp_opt_in and not user_obj.whatsapp_activated:
            # Use business phone number for wa.me link (not Phone ID). Ensure only digits (no leading +)
            business_phone = os.getenv('WHATSAPP_BUSINESS_PHONE', '917984113438')
            business_phone_digits = ''.join(filter(str.isdigit, business_phone))
            activation_link = f"https://wa.me/{business_phone_digits}?text=Start%20WhatsApp%20updates%20for%20{user_type}%20{user_obj.id}"
        
        return Response({
            'opt_in': user_obj.whatsapp_opt_in,
            'activated': user_obj.whatsapp_activated,
            'phone_number': user_obj.phone_number or '',
            'activation_link': activation_link,
            'show_banner': user_obj.whatsapp_opt_in is None or (user_obj.whatsapp_opt_in and not user_obj.whatsapp_activated)
        }, status=200)
        
    except Exception as e:
        logger.exception(f"❌ Error getting WhatsApp status: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_whatsapp(request):
    """
    Activate WhatsApp for the logged-in user by sending a test message.
    Called when user clicks the activation button.
    Sends actual WhatsApp message to verify phone number works.
    """
    try:
        user_email = request.user.email
        
        # Try to find user in Educator or Manager table
        educator = Educator.objects.filter(email=user_email).first()
        manager = Manager.objects.filter(email=user_email).first()
        
        user_obj = educator or manager
        if not user_obj:
            return Response({'error': 'User not found'}, status=404)
        
        # Check if user has opted in
        if not user_obj.whatsapp_opt_in:
            return Response({'error': 'Must opt-in first before activating'}, status=400)
        
        # Check if phone number exists
        if not user_obj.phone_number:
            return Response({'error': 'Phone number not found. Please update your profile with a valid phone number.'}, status=400)
        
        # Check if already activated
        if user_obj.whatsapp_activated:
            return Response({
                'success': True,
                'message': 'WhatsApp notifications already activated',
                'activated': True,
                'first_interaction': str(user_obj.whatsapp_first_interaction_timestamp)
            }, status=200)
        
        user_type = 'educator' if educator else 'manager'
        
        # Send test/welcome message via WhatsApp to verify number works
        try:
            normalized_phone = format_phone_number(user_obj.phone_number)
            
            # Mark user as activated immediately (user clicked activation in UI)
            user_obj.whatsapp_activated = True
            user_obj.whatsapp_first_interaction_timestamp = timezone.now()
            user_obj.save(update_fields=['whatsapp_activated', 'whatsapp_first_interaction_timestamp'])
            logger.info(f"ℹ️ Marked WhatsApp activated for {user_type} {user_obj.id} ({user_obj.email}) on button click")

            # Attempt to send a welcome message but do not fail activation if send fails.
            welcome_payload = {
                "messaging_product": "whatsapp",
                "to": normalized_phone,
                "type": "text",
                "text": {
                    "body": "✅ Welcome to Inzighted!\n\nYour WhatsApp notifications are now active. You'll receive important updates about test results and assessments here.\n\nThank you!"
                }
            }

            try:
                result = send_whatsapp_message(normalized_phone, welcome_payload)
                if not result.get('success'):
                    logger.error(f"❌ Welcome message send failed to {normalized_phone}: {result.get('error')} (code={result.get('response_code')})")
                else:
                    logger.info(f"📱 Welcome message sent to {normalized_phone}")
            except Exception as e:
                logger.exception(f"Exception while sending welcome message to {normalized_phone}: {e}")
            
        except ValueError as ve:
            logger.error(f"Invalid phone number for {user_email}: {ve}")
            return Response({
                'error': f'Invalid phone number: {str(ve)}',
                'details': 'Please update your phone number in E.164 format (e.g., +919876543210)'
            }, status=400)
        except Exception as we:
            logger.exception(f"Error processing activation: {we}")
            return Response({
                'error': f'Failed to activate: {str(we)}',
                'details': 'Please try again or contact support.'
            }, status=500)
        
        logger.info(f"✅ WhatsApp activated for {user_type} {user_obj.id} ({user_obj.email})")
        
        return Response({
            'success': True,
            'message': 'WhatsApp notifications activated! A welcome message will be sent to your phone.',
            'activated': True,
            'first_interaction': str(user_obj.whatsapp_first_interaction_timestamp),
            'phone_number': normalized_phone
        }, status=200)
        
    except Exception as e:
        logger.exception(f"❌ Error activating WhatsApp: {e}")
        return Response({'error': str(e)}, status=500)


@csrf_exempt
def whatsapp_webhook(request):
    """
    Webhook endpoint for incoming WhatsApp messages from Meta.
    
    Handles:
    1. Verification challenge (GET)
    2. Incoming message notifications (POST)
    
    Verifies signature and updates user activation status.
    """
    if request.method == 'GET':
        # Webhook verification
        mode = request.GET.get('hub.mode')
        token = request.GET.get('hub.verify_token')
        challenge = request.GET.get('hub.challenge')
        
        verify_token = os.getenv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'inzighted_whatsapp_2026')
        
        if mode == 'subscribe' and token == verify_token:
            logger.info("✅ WhatsApp webhook verified successfully")
            return HttpResponse(challenge, content_type='text/plain')
        else:
            logger.warning(f"❌ WhatsApp webhook verification failed: mode={mode}, token_match={token == verify_token}")
            return HttpResponse('Verification failed', status=403)
    
    elif request.method == 'POST':
        # Verify signature
        signature = request.headers.get('X-Hub-Signature-256', '')
        app_secret = os.getenv('WHATSAPP_APP_SECRET', '')
        
        if app_secret:
            body = request.body
            expected_signature = 'sha256=' + hmac.new(
                app_secret.encode('utf-8'),
                body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                logger.error("❌ WhatsApp webhook signature verification failed")
                return HttpResponse('Invalid signature', status=403)
        
        # Process incoming message
        try:
            data = json.loads(request.body)
            logger.debug(f"📨 WhatsApp webhook received: {json.dumps(data, indent=2)}")
            
            # Extract message data
            entries = data.get('entry', [])
            for entry in entries:
                changes = entry.get('changes', [])
                for change in changes:
                    value = change.get('value', {})
                    messages = value.get('messages', [])
                    
                    for message in messages:
                        from_number = message.get('from')  # Phone number
                        message_text = message.get('text', {}).get('body', '')
                        message_id = message.get('id')
                        
                        logger.info(f"📱 Incoming WhatsApp from {from_number}: {message_text[:50]}")
                        
                        # Try to match user by phone number
                        matched_user = None
                        user_type = None
                        
                        # Normalize incoming phone (add + if missing) and digits for flexible matching
                        normalized_from = from_number if from_number and from_number.startswith('+') else (f'+{from_number}' if from_number else '')
                        incoming_digits = ''.join(filter(str.isdigit, normalized_from or ''))

                        # Try exact matches first (with and without +)
                        educator = None
                        manager = None
                        if normalized_from:
                            educator = Educator.objects.filter(phone_number=normalized_from).first()
                        if not educator and from_number:
                            educator = Educator.objects.filter(phone_number=from_number).first()

                        # If still not found, try suffix match on last 10 digits
                        if not educator and incoming_digits:
                            last10 = incoming_digits[-10:]
                            educator = Educator.objects.filter(phone_number__endswith=last10).first()

                        if educator:
                            matched_user = educator
                            user_type = 'educator'
                        else:
                            # Try manager following same strategy
                            if normalized_from:
                                manager = Manager.objects.filter(phone_number=normalized_from).first()
                            if not manager and from_number:
                                manager = Manager.objects.filter(phone_number=from_number).first()
                            if not manager and incoming_digits:
                                last10 = incoming_digits[-10:]
                                manager = Manager.objects.filter(phone_number__endswith=last10).first()
                            if manager:
                                matched_user = manager
                                user_type = 'manager'
                        
                        # Also try to extract user ID from message text
                        if not matched_user:
                            import re
                            id_match = re.search(r'(educator|manager)\s+(\d+)', message_text.lower())
                            if id_match:
                                user_type = id_match.group(1)
                                user_id = int(id_match.group(2))
                                
                                if user_type == 'educator':
                                    matched_user = Educator.objects.filter(id=user_id).first()
                                else:
                                    matched_user = Manager.objects.filter(id=user_id).first()
                        
                        if matched_user:
                            # Activate user if not already activated
                            if not matched_user.whatsapp_activated:
                                # Mark user activated immediately on receiving their message.
                                matched_user.whatsapp_activated = True
                                matched_user.whatsapp_first_interaction_timestamp = timezone.now()
                                matched_user.save(update_fields=['whatsapp_activated', 'whatsapp_first_interaction_timestamp'])

                                logger.info(f"✅ WhatsApp activated for {user_type} {matched_user.id} ({matched_user.email})")

                                # Send welcome message but do not depend activation on its success.
                                try:
                                    welcome_payload = {
                                        "messaging_product": "whatsapp",
                                        "to": normalized_from,
                                        "type": "text",
                                        "text": {
                                            "body": "✅ You're all set! You'll now receive important notifications and updates on WhatsApp."
                                        }
                                    }
                                    result = send_whatsapp_message(normalized_from, welcome_payload)
                                    if not result.get('success'):
                                        logger.error(
                                            f"❌ Failed to send welcome message to {normalized_from}: {result.get('error')} (code={result.get('response_code')}) body={result.get('response_body')}")
                                    else:
                                        logger.info(f"✅ Welcome message sent to {normalized_from}")
                                except Exception as we:
                                    logger.exception(f"Failed to send welcome message: {we}")
                            else:
                                logger.info(f"ℹ️ {user_type} {matched_user.id} already activated")
                        else:
                            logger.warning(f"⚠️ Could not match WhatsApp message from {from_number} to any user")
            
            return HttpResponse('OK', status=200)
            
        except Exception as e:
            logger.exception(f"❌ Error processing WhatsApp webhook: {e}")
            return HttpResponse('Error processing webhook', status=500)
    
    return HttpResponse('Method not allowed', status=405)
