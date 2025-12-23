"""
Quick test script for WhatsApp notifications.
Run this from Django shell to test WhatsApp integration.

Usage:
    cd backend
    python manage.py shell < test_whatsapp.py

Or in Django shell:
    exec(open('test_whatsapp.py').read())
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inzighted.settings')
django.setup()

from exam.models import Educator, NotificationLog
from exam.services.whatsapp_notification import (
    send_whatsapp_notification,
    WhatsAppConfig,
    format_phone_number,
    build_whatsapp_payload,
    send_whatsapp_message
)

print("=" * 60)
print("WhatsApp Notification Test Script")
print("=" * 60)

# Check configuration
print("\n1. Checking Configuration...")
print(f"   WHATSAPP_ENABLED: {WhatsAppConfig.ENABLED}")
print(f"   WHATSAPP_TOKEN: {'Set' if WhatsAppConfig.TOKEN else 'Not Set'}")
print(f"   WHATSAPP_PHONE_ID: {WhatsAppConfig.PHONE_ID if WhatsAppConfig.PHONE_ID else 'Not Set'}")
print(f"   API_BASE: {WhatsAppConfig.API_BASE}")
print(f"   Is Configured: {WhatsAppConfig.is_configured()}")

if not WhatsAppConfig.is_configured():
    print("\n❌ WhatsApp is not properly configured!")
    print("   Please set WHATSAPP_ENABLED=true, WHATSAPP_TOKEN, and WHATSAPP_PHONE_ID in .env")
    sys.exit(1)

# Find an educator with phone number
print("\n2. Finding Educators with Phone Numbers...")
educators_with_phone = Educator.objects.exclude(phone_number__isnull=True).exclude(phone_number='')

if not educators_with_phone.exists():
    print("   ❌ No educators found with phone numbers!")
    print("\n   To add a phone number:")
    print("   >>> educator = Educator.objects.first()")
    print("   >>> educator.phone_number = '+916383097091'  # Your test number")
    print("   >>> educator.save()")
    sys.exit(1)

educator = educators_with_phone.first()
print(f"   ✅ Found educator: {educator.email}")
print(f"   Phone: {educator.phone_number}")
print(f"   Name: {educator.name}")
print(f"   Class: {educator.class_id}")

# Format phone number
print("\n3. Formatting Phone Number...")
formatted_phone = format_phone_number(educator.phone_number)
print(f"   Original: {educator.phone_number}")
print(f"   Formatted: {formatted_phone}")

# Build payload
print("\n4. Building WhatsApp Payload...")
payload = build_whatsapp_payload(
    phone_number=formatted_phone,
    class_id=educator.class_id or "TEST_CLASS",
    test_num=999,
    educator_name=educator.name
)
print(f"   Template: {payload['template']['name']}")
print(f"   Language: {payload['template']['language']['code']}")
print(f"   To: {payload['to']}")

# Check for existing notifications
print("\n5. Checking for Existing Notifications...")
test_class = educator.class_id or "TEST_CLASS"
test_num = 999

existing = NotificationLog.objects.filter(
    class_id=test_class,
    test_num=test_num,
    notification_type='TEST_COMPLETE'
).first()

if existing:
    print(f"   ⚠️  Notification already exists (ID: {existing.id})")
    print(f"   Sent: {existing.sent}")
    print(f"   Attempts: {existing.attempts}")
    print(f"   Created: {existing.created_at}")
    if existing.error:
        print(f"   Error: {existing.error}")
else:
    print("   ✅ No existing notification found")

# Ask for confirmation
print("\n6. Ready to Send Test Notification")
print(f"   This will send a WhatsApp message to: {formatted_phone}")
print(f"   Educator: {educator.name} ({educator.email})")

response = input("\n   Do you want to send the test notification? (yes/no): ")

if response.lower() != 'yes':
    print("\n   ❌ Test cancelled by user")
    sys.exit(0)

# Send notification
print("\n7. Sending WhatsApp Notification...")
print("   Triggering Celery task...")

try:
    # Use synchronous call for testing (apply instead of delay)
    result = send_whatsapp_notification.apply(
        args=[test_class, test_num, educator.id]
    )
    
    print(f"\n   ✅ Task completed!")
    print(f"   Result: {result.result}")
    
    # Check notification log
    log = NotificationLog.objects.filter(
        class_id=test_class,
        test_num=test_num,
        notification_type='TEST_COMPLETE'
    ).first()
    
    if log:
        print(f"\n8. Notification Log:")
        print(f"   ID: {log.id}")
        print(f"   Sent: {log.sent}")
        print(f"   Attempts: {log.attempts}")
        print(f"   Response Code: {log.response_code}")
        if log.sent:
            print(f"   ✅ Sent At: {log.sent_at}")
        if log.error:
            print(f"   ❌ Error: {log.error}")
        if log.response_body:
            print(f"   Response: {log.response_body[:200]}")
    
except Exception as e:
    print(f"\n   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Test Complete!")
print("=" * 60)
print("\nCheck your WhatsApp on", formatted_phone)
print("You should receive a message about Test 999")
print("\nTo view all notification logs:")
print(">>> from exam.models import NotificationLog")
print(">>> NotificationLog.objects.all().values()")
