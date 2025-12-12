# WhatsApp Notification System Documentation

## Overview
Automated WhatsApp notifications are sent to educators when test processing completes successfully. The system uses Facebook's WhatsApp Business API and implements robust idempotency, retry logic, and monitoring.

## Features
- ✅ **Automatic notifications**: Sent when test processing reaches final "Successful" status
- ✅ **Idempotency**: Each test completion triggers exactly one notification (no spam)
- ✅ **Retry logic**: Failed sends automatically retry with exponential backoff
- ✅ **Monitoring**: Full audit trail in `NotificationLog` model
- ✅ **Non-blocking**: Notification failures don't break the processing pipeline
- ✅ **Admin controls**: View, retry, and manage notifications via Django admin

## Architecture

### Flow
1. Test processing completes → `update_educator_dashboard` marks status as "Successful"
2. System checks if educator has `phone_number` configured
3. Celery task `send_whatsapp_notification` is scheduled (async)
4. Task checks `NotificationLog` for existing sent notification (idempotency)
5. If not sent, calls WhatsApp API and records result
6. On failure, Celery automatically retries (max 3 attempts with backoff)

### Database Models

#### Educator Model (Updated)
```python
class Educator(models.Model):
    # ... existing fields ...
    phone_number = models.CharField(max_length=20, blank=True, null=True)
```

#### NotificationLog Model (New)
```python
class NotificationLog(models.Model):
    class_id = models.CharField(max_length=255)
    test_num = models.IntegerField()
    educator = models.ForeignKey('Educator', on_delete=models.SET_NULL, null=True)
    notification_type = models.CharField(max_length=50)  # 'TEST_COMPLETE', 'TEST_FAILED'
    
    sent = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    
    phone_number = models.CharField(max_length=20)
    payload = models.JSONField(blank=True, null=True)
    response_code = models.IntegerField(null=True)
    response_body = models.TextField(blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(default=now)
    sent_at = models.DateTimeField(null=True)
    
    class Meta:
        unique_together = ('class_id', 'test_num', 'notification_type')
```

## Setup & Configuration

### 1. Environment Variables
Add these to your `.env` or `.env.docker`:

```bash
# WhatsApp Business API Configuration
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=your_temporary_access_token_here
WHATSAPP_PHONE_ID=951798411343848  # Your test phone number ID
WHATSAPP_API_VERSION=v22.0
WHATSAPP_TEMPLATE_NAME=test_completion_notification
WHATSAPP_TEMPLATE_LANGUAGE=en_US
```

**Important**: Never commit the `.env` file. Use secure secret management in production.

### 2. Database Migration
Run migrations to add the new fields and table:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

This creates:
- `phone_number` field in `exam_educator` table
- `exam_notificationlog` table

### 3. Celery Worker
Ensure Celery worker is running to process notification tasks:

```bash
# Local development
celery -A inzighted --workdir /path/to/backend worker -l info

# Docker
docker compose up worker
```

### 4. WhatsApp Business Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create/select your app
3. Add WhatsApp product
4. Get temporary access token (valid 60 minutes for testing)
5. Get Phone Number ID from dashboard
6. Add test recipient phone numbers

From your test credentials:
- **Access Token**: `EAALmjGxe0H0BQIXqHCvEo9Y7K7dQ8yQSyOBrY3LIZBZAPsTznLZBOR4VkYqct2XLJFVerrTv1imUcveLamEBUTv56DmCGDm...`
- **Phone Number ID**: `951798411343848`
- **Test Number**: `+1 555 192 6181`
- **Recipient**: `+91 63830 97091`

## Usage

### Adding Phone Numbers
Educators can provide phone numbers during registration:

**Frontend**: Add phone number field to educator registration form
**Backend**: Already configured to accept and save `phone_number` in `educator_register` view

### Testing
1. Upload a test via the educator dashboard
2. Wait for processing to complete
3. Check logs for notification scheduling
4. Verify in Django admin: `/admin/exam/notificationlog/`
5. Check recipient's WhatsApp for message

### Manual Testing (Python Shell)
```python
python manage.py shell

from exam.services.whatsapp_notification import send_whatsapp_notification

# Trigger notification for a specific test
send_whatsapp_notification.delay('CLASS123', 1, educator_id=5)
```

### Testing with cURL
```bash
curl -i -X POST \
  https://graph.facebook.com/v22.0/951798411343848/messages \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "+916383097091",
    "type": "text",
    "text": {
      "body": "Test message from Inzighted"
    }
  }'
```

## Monitoring & Admin

### Django Admin
Navigate to: `/admin/exam/notificationlog/`

**Features**:
- View all notifications (sent and pending)
- Filter by status, date, class, educator
- See full API responses and errors
- Retry failed notifications manually

### Retry Failed Notifications
```python
from exam.services.whatsapp_notification import retry_failed_notifications

# Retry all failed notifications
retry_failed_notifications.delay()

# Retry for specific test
retry_failed_notifications.delay(class_id='CLASS123', test_num=1)
```

### Logs
Monitor Celery logs for notification activity:
```bash
# Look for these log prefixes:
# 📱 WhatsApp notification task started
# ✅ WhatsApp sent successfully
# ❌ WhatsApp send failed
```

## Security & Best Practices

### Security
- ✅ Access tokens stored in environment variables (never in code)
- ✅ Phone numbers validated and formatted to E.164
- ✅ All API responses logged for audit
- ✅ Non-blocking: failures don't break main pipeline
- ✅ Rate limiting (via Celery task retry delays)

### Privacy
- ✅ Opt-in: Only educators with phone numbers receive notifications
- ✅ No sensitive student data in messages
- ✅ Educators can opt out by removing phone number

### Best Practices
1. **Start with test credentials**: Use provided test numbers before production
2. **Monitor closely**: Watch NotificationLog for failures
3. **Set alerts**: Alert on high failure rates
4. **Rotate tokens**: Refresh access tokens regularly (they expire)
5. **Use templates**: Upgrade to WhatsApp templates for production (current uses text)
6. **Respect rate limits**: WhatsApp has rate limits per number

## Troubleshooting

### Common Issues

#### "WhatsApp is not configured or disabled"
- Check `WHATSAPP_ENABLED=true` in `.env`
- Verify `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` are set
- Restart Django/Celery after env changes

#### "No phone number"
- Educator hasn't provided phone number
- Add phone field to registration form
- Update existing educators in admin

#### "HTTP 401: Unauthorized"
- Access token expired (valid 60 min for test tokens)
- Generate new token from Facebook Developers
- Update `WHATSAPP_TOKEN` in `.env`

#### "HTTP 400: Invalid phone number"
- Phone must be in E.164 format (+919876543210)
- System auto-formats, but verify in NotificationLog
- Test recipient must be added in Facebook dashboard

#### Notifications not sending
1. Check Celery worker is running: `docker compose logs worker`
2. Check logs: `docker compose logs app | grep WhatsApp`
3. Verify in admin: `/admin/exam/notificationlog/`
4. Try manual retry from admin

### Debug Mode
Enable detailed logging:
```python
# settings.py
LOGGING = {
    'loggers': {
        'exam.services.whatsapp_notification': {
            'level': 'DEBUG',
        },
    },
}
```

## Rollout Plan

### Phase 1: Testing (Current)
- [x] Use test credentials
- [x] Test with 1-2 educators
- [x] Monitor logs and NotificationLog
- [x] Verify no spam (idempotency works)

### Phase 2: Staging
- [ ] Deploy to staging environment
- [ ] Get production WhatsApp Business account approved
- [ ] Create message templates (required for production)
- [ ] Test with larger group
- [ ] Set up monitoring/alerts

### Phase 3: Production
- [ ] Enable feature flag for small cohort
- [ ] Monitor for 1 week
- [ ] Gradually increase to 100%
- [ ] Set up on-call rotation for issues

## Rollback Procedure
If issues arise:

1. **Immediate**: Set `WHATSAPP_ENABLED=false` in `.env`
2. **Restart**: `docker compose restart app worker`
3. **Verify**: No new notifications in NotificationLog
4. **Investigate**: Check logs and error details
5. **Fix**: Address root cause
6. **Re-enable**: Set `WHATSAPP_ENABLED=true` when ready

## API Reference

### Core Functions

#### `send_whatsapp_notification(class_id, test_num, educator_id=None)`
Celery task that sends notification.

**Args**:
- `class_id` (str): Class identifier
- `test_num` (int): Test number
- `educator_id` (int, optional): Educator ID

**Returns**: Dict with success status

#### `retry_failed_notifications(class_id=None, test_num=None)`
Retry failed notifications.

**Args**:
- `class_id` (str, optional): Filter by class
- `test_num` (int, optional): Filter by test

## Support & Contact
- **Issues**: Open GitHub issue with `[WhatsApp]` prefix
- **Urgent**: Email techsupport@zai-fi.com
- **Monitoring**: Check `/admin/exam/notificationlog/`

## Changelog

### v1.0.0 (December 2025)
- ✅ Initial implementation
- ✅ Educator phone_number field
- ✅ NotificationLog model
- ✅ WhatsApp API integration
- ✅ Celery task with retry logic
- ✅ Django admin interface
- ✅ Idempotency via unique constraint
- ✅ Integration with update_educator_dashboard
