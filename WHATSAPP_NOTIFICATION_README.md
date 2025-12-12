# WhatsApp Notification System

## Overview

This system sends WhatsApp notifications to educators when test processing is completed. It uses the Facebook Graph API (WhatsApp Business API) and implements proper idempotency, retry logic, and monitoring.

## Features

- ✅ Automatic notifications when test processing completes
- ✅ Idempotent (prevents duplicate notifications)
- ✅ Automatic retry with exponential backoff (up to 3 retries)
- ✅ Complete audit trail via `NotificationLog` model
- ✅ Feature flag to enable/disable notifications
- ✅ Admin tools to view and retry failed notifications
- ✅ Non-blocking async execution via Celery

## Configuration

### 1. Environment Variables

Add these variables to your `.env` file (see `.env.whatsapp.example`):

```bash
# WhatsApp Business API Configuration
WHATSAPP_ENABLED=true                          # Set to 'true' to enable notifications
WHATSAPP_TOKEN=your_access_token_here          # Temporary access token from Facebook
WHATSAPP_PHONE_ID=your_phone_number_id_here    # WhatsApp Business Phone Number ID
WHATSAPP_API_VERSION=v22.0                     # Graph API version

# Template Configuration (currently using test template)
# Using: jaspers_market_plain_text_v1 (test template)
# TODO: Replace with custom approved template once available
```

**Important Notes:**
- **Test Template**: Currently using `jaspers_market_plain_text_v1` from WhatsApp test credentials
- **Production**: Once you have a custom approved template, update the template name in `backend/exam/services/whatsapp_notification.py`
- The temporary access token expires in 60 minutes - use permanent tokens for production
- Get tokens from: https://developers.facebook.com/apps/

### 2. Database Setup

Run migrations to add required models:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

This creates:
- `phone_number` field in `Educator` model
- `NotificationLog` model for tracking sent notifications

### 3. Educator Phone Number

Educators need to have their phone number added to receive notifications:

**During Registration:**
- The registration form now includes an optional `phone_number` field
- Phone numbers should be in E.164 format: `+919876543210`

**For Existing Educators:**
Update via Django admin or shell:

```python
from exam.models import Educator

educator = Educator.objects.get(email='teacher@example.com')
educator.phone_number = '+919876543210'
educator.save()
```

## How It Works

### Flow

1. **Test Upload**: Educator uploads test files via the UI
2. **Processing**: Backend processes test (extract questions, analyze, generate insights)
3. **Dashboard Update**: `update_educator_dashboard` completes successfully
4. **Status Update**: `TestProcessingStatus` is marked as "Successful" with `ended_at` timestamp
5. **Notification Trigger**: `send_whatsapp_notification` Celery task is scheduled
6. **Idempotency Check**: Check if notification already sent (via `NotificationLog`)
7. **Send Message**: Call WhatsApp API with template
8. **Log Result**: Update `NotificationLog` with success/failure
9. **Retry on Failure**: Automatic retry up to 3 times with exponential backoff

### Code Integration

The notification is triggered in `backend/exam/services/update_dashboard.py`:

```python
# After marking test as successful
if WhatsAppConfig.is_configured() and educator and educator.phone_number:
    send_whatsapp_notification.delay(class_id, test_num, educator.id)
```

## Database Models

### NotificationLog

Tracks all notification attempts:

```python
class NotificationLog(models.Model):
    class_id = CharField          # Class identifier
    test_num = IntegerField        # Test number
    educator = ForeignKey          # Educator who receives notification
    notification_type = CharField  # Type: 'TEST_COMPLETE'
    phone_number = CharField       # Formatted phone number
    sent = BooleanField           # Whether successfully sent
    sent_at = DateTimeField       # When sent (if successful)
    attempts = IntegerField        # Number of send attempts
    payload = JSONField           # Message payload sent to WhatsApp
    response_code = IntegerField  # HTTP response code from WhatsApp
    response_body = TextField     # API response body
    error = TextField             # Error message if failed
    created_at = DateTimeField    # First attempt timestamp
    updated_at = DateTimeField    # Last update timestamp
```

**Unique Constraint:** (`class_id`, `test_num`, `notification_type`) - prevents duplicate sends

## Testing

### Local Testing

1. **Set Test Credentials** (from WhatsApp test environment):

```bash
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=EAALmjGxe0H0BQlXqH...  # Your test token
WHATSAPP_PHONE_ID=951798411343848      # Your test phone ID
```

2. **Add Test Phone Number** to an educator:

```python
educator = Educator.objects.first()
educator.phone_number = '+916383097091'  # Your test recipient number
educator.save()
```

3. **Trigger Manually** (Django shell):

```python
from exam.services.whatsapp_notification import send_whatsapp_notification

# Send test notification
send_whatsapp_notification.delay('TEST_CLASS', 1, educator_id=1)
```

4. **Check Logs**:

```bash
# Check Celery worker logs
tail -f logs/celery.log

# Check notification log in DB
python manage.py shell
>>> from exam.models import NotificationLog
>>> NotificationLog.objects.all().values()
```

### End-to-End Testing

1. Upload a test via the UI
2. Wait for processing to complete
3. Check educator's WhatsApp for notification
4. Verify `NotificationLog` entry in database

## Admin Tools

### Django Admin

Access notification logs at: `/admin/exam/notificationlog/`

You can:
- View all sent/failed notifications
- Filter by status, class, test, date
- See error messages and response codes
- Retry failed notifications manually

### Retry Failed Notifications

**Via Django Shell:**

```python
from exam.services.whatsapp_notification import retry_failed_notifications

# Retry all failed notifications
retry_failed_notifications.delay()

# Retry for specific class
retry_failed_notifications.delay(class_id='CLASS123')

# Retry for specific test
retry_failed_notifications.delay(class_id='CLASS123', test_num=1)
```

**Programmatically:**

```python
from exam.models import NotificationLog
from exam.services.whatsapp_notification import send_whatsapp_notification

# Find failed notifications
failed = NotificationLog.objects.filter(sent=False, attempts__lt=5)

# Retry each
for log in failed:
    send_whatsapp_notification.delay(log.class_id, log.test_num, log.educator_id)
```

## Monitoring

### Key Metrics to Track

1. **Success Rate**: Percentage of notifications sent successfully
2. **Failure Rate**: Percentage of notifications that failed after all retries
3. **Average Delivery Time**: Time from test completion to notification sent
4. **Retry Count**: Number of retries needed

### Database Queries

```python
from exam.models import NotificationLog
from django.db.models import Count, Avg

# Success rate
total = NotificationLog.objects.count()
successful = NotificationLog.objects.filter(sent=True).count()
success_rate = (successful / total * 100) if total > 0 else 0

# Failed notifications (after all retries)
failed = NotificationLog.objects.filter(sent=False, attempts__gte=3)

# Average attempts
avg_attempts = NotificationLog.objects.aggregate(Avg('attempts'))
```

## Troubleshooting

### Notification Not Sent

**Check:**

1. **Feature Flag**: `WHATSAPP_ENABLED=true` in `.env`
2. **Configuration**: Token and Phone ID set correctly
3. **Educator Phone**: Phone number is set and properly formatted
4. **Celery Running**: Celery worker is running and processing tasks
5. **Logs**: Check `NotificationLog` for error messages

```python
# Check specific notification
from exam.models import NotificationLog
log = NotificationLog.objects.filter(class_id='CLASS123', test_num=1).first()
print(log.error)
print(log.response_body)
```

### Common Errors

**"WhatsApp not configured"**
- Set `WHATSAPP_ENABLED=true`
- Ensure token and phone ID are set

**"No phone number"**
- Educator doesn't have phone number set
- Add phone number to educator profile

**"HTTP 400/401"**
- Invalid or expired token
- Generate new token from Facebook Developer Console

**"HTTP 403"**
- Phone number not whitelisted (in test mode)
- Template not approved (for production)

**"Template not found"**
- Using test template but haven't sent to test numbers
- Need to approve custom template for production

## Production Deployment

### Pre-Production Checklist

- [ ] Get permanent access token (not 60-minute temp token)
- [ ] Create and approve custom WhatsApp message template
- [ ] Update template name in `whatsapp_notification.py`
- [ ] Add phone numbers to all educators
- [ ] Test with staging environment
- [ ] Set up monitoring and alerts
- [ ] Configure rate limiting if needed
- [ ] Document runbook for support team

### Rollout Strategy

1. **Phase 1**: Deploy with `WHATSAPP_ENABLED=false`
2. **Phase 2**: Enable for test classes only
3. **Phase 3**: Monitor for 48 hours
4. **Phase 4**: Gradually enable for all classes
5. **Phase 5**: Set up alerts for high failure rates

### Security Considerations

- **Never commit tokens** to git (use `.env` and `.gitignore`)
- **Use secret manager** in production (AWS Secrets Manager, etc.)
- **Rotate tokens** periodically
- **Rate limit** sends to avoid abuse
- **Validate phone numbers** before sending
- **Provide opt-out** mechanism for educators

## Future Enhancements

- [ ] Custom message templates with placeholders
- [ ] Multiple notification types (daily summary, urgent alerts, etc.)
- [ ] Webhook for delivery status updates
- [ ] SMS fallback if WhatsApp fails
- [ ] User preferences (notification frequency, opt-in/out)
- [ ] Rich messages with buttons/images
- [ ] Analytics dashboard for notification metrics
- [ ] Scheduled digest notifications

## Support

For issues or questions:
- Check logs in `NotificationLog` model
- Review Celery worker logs
- Contact DevOps team for token/configuration issues
- See Facebook WhatsApp Business API docs: https://developers.facebook.com/docs/whatsapp/

## Template Update Guide

When your custom template is approved:

1. **Update the template name** in `backend/exam/services/whatsapp_notification.py`:

```python
def build_whatsapp_payload(phone_number: str, class_id: str, test_num: int, educator_name: str) -> Dict[str, Any]:
    return {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "template",
        "template": {
            "name": "your_approved_template_name",  # Update this
            "language": {"code": "en_US"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        # Update parameters based on your template
                        {"type": "text", "text": f"Test {test_num}"},
                        {"type": "text", "text": class_id}
                    ]
                }
            ]
        }
    }
```

2. **Test with staging** environment
3. **Deploy to production**
4. **Update this README** with new template details
