# WhatsApp Notification - Quick Start Guide

## ✅ What's Been Implemented

The complete WhatsApp notification system is now integrated and ready to use. Here's what was done:

### 1. Database Changes ✅
- Added `phone_number` field to `Educator` model
- Created `NotificationLog` model to track all notifications
- Migration completed: `0009_educator_phone_number_notificationlog`

### 2. Service Layer ✅
- **File**: `backend/exam/services/whatsapp_notification.py`
- WhatsApp API integration using Graph API v22.0
- Using test template: `jaspers_market_plain_text_v1`
- Automatic retry with exponential backoff (3 attempts)
- Complete idempotency via `NotificationLog`

### 3. Integration ✅
- **File**: `backend/exam/services/update_dashboard.py`
- Notification triggered when `update_educator_dashboard` completes
- Only sends when test status is marked as final "Successful"
- Non-blocking Celery task execution

### 4. Configuration ✅
- Environment variables documented in `.env.whatsapp.example`
- Feature flag: `WHATSAPP_ENABLED`
- Secure token management

### 5. Testing Tools ✅
- Test script: `backend/test_whatsapp.py`
- Admin interface for `NotificationLog`
- Retry functionality for failed notifications

---

## 🚀 Quick Start (5 Steps)

### Step 1: Set Environment Variables

Copy your test credentials to `.env`:

```bash
cd /home/ubuntu/Inzighted_V1
nano .env
```

Add these lines:

```bash
# WhatsApp Configuration
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=EAALmjGxe0H0BQIXqHCvEo9Y7K7dQ8yQSyOBrY3LIZBZAPsTznLZBOR4VkYqct2XLJFVerrTv1imUcveLamEBUTv56DmCGDmwk0nN791kpZCPsEJMHgDZCgIu1J4kQFgEPvhy3M6NsRgq4PT2MyIGQF
WHATSAPP_PHONE_ID=951798411343848
WHATSAPP_API_VERSION=v22.0
```

### Step 2: Add Phone Number to Educator

```bash
cd backend
python manage.py shell
```

```python
from exam.models import Educator

# Find your test educator
educator = Educator.objects.first()  # or filter by email

# Add phone number (must be whitelisted in WhatsApp test account)
educator.phone_number = '+916383097091'  # Your test number
educator.save()

print(f"✅ Phone added to {educator.email}")
```

### Step 3: Restart Services

```bash
# Restart Django
# If using runserver:
# Ctrl+C and restart: python manage.py runserver

# Restart Celery worker
# Find and kill existing celery process, then:
celery -A inzighted worker -l info

# Or if using docker:
docker compose restart app worker
```

### Step 4: Test the Notification

**Option A: Use Test Script**

```bash
cd backend
python test_whatsapp.py
```

Follow the prompts - it will:
- Check your configuration
- Find educator with phone
- Ask for confirmation
- Send test notification
- Show results

**Option B: Upload a Test**

1. Go to educator dashboard
2. Upload a real test (question paper, answer key, responses)
3. Wait for processing to complete
4. Notification will be sent automatically when status becomes "Successful"
5. Check WhatsApp on the registered phone number

### Step 5: Verify in Database

```bash
python manage.py shell
```

```python
from exam.models import NotificationLog

# View all notifications
logs = NotificationLog.objects.all()
for log in logs:
    print(f"Class: {log.class_id}, Test: {log.test_num}, Sent: {log.sent}, Phone: {log.phone_number}")

# View latest notification
latest = NotificationLog.objects.latest('created_at')
print(f"Status: {'✅ Sent' if latest.sent else '❌ Failed'}")
print(f"Response Code: {latest.response_code}")
print(f"Error: {latest.error}")
```

---

## 📊 Monitoring

### View Notifications in Admin

1. Go to: `http://your-domain/admin/`
2. Navigate to: **Exam > Notification logs**
3. See all sent/failed notifications
4. Filter by class, test, or status

### Check Logs

```bash
# Celery logs
tail -f logs/celery.log | grep WhatsApp

# Django logs
tail -f logs/django.log | grep notification
```

---

## 🔧 Troubleshooting

### "WhatsApp not configured"
- Check `.env` file has all variables set
- Verify `WHATSAPP_ENABLED=true`
- Restart services after changing `.env`

### "No phone number"
- Educator doesn't have phone_number set
- Add via Django shell (see Step 2 above)

### "HTTP 400/401 Error"
- Token might be expired (60 min for test tokens)
- Generate new token from Facebook Developer Console
- Update `WHATSAPP_TOKEN` in `.env`

### "Template not found"
- Using test template requires test phone numbers
- Phone must be added to WhatsApp Business test account
- Check Facebook Developer Console > WhatsApp > Phone Numbers

### Notification Not Received
1. Check `NotificationLog` for the notification
2. Look at `error` field for details
3. Verify phone number format: `+919876543210`
4. Ensure phone is whitelisted in test account
5. Check Celery worker is running

---

## 🎯 Key Features

### Idempotency
- Same test won't send duplicate notifications
- Safe to retry failed notifications
- Tracked via `NotificationLog` unique constraint

### Automatic Retries
- 3 retry attempts with exponential backoff
- Failures logged in `NotificationLog.error`
- Manual retry available via admin

### Non-Blocking
- Celery task runs asynchronously
- Won't block test processing pipeline
- Failure doesn't affect test results

### Complete Audit Trail
- Every send attempt logged
- Response codes and bodies stored
- Timestamps for tracking
- Error messages preserved

---

## 📝 What Happens When Test Completes?

1. ✅ Test processing finishes
2. ✅ `update_educator_dashboard` marks status as "Successful"
3. ✅ Sets `ended_at` timestamp
4. ✅ Checks if WhatsApp is enabled and educator has phone
5. ✅ Schedules `send_whatsapp_notification` Celery task
6. ✅ Task checks `NotificationLog` for duplicate
7. ✅ Calls WhatsApp API with test template
8. ✅ Logs result in `NotificationLog`
9. ✅ Educator receives WhatsApp message
10. ✅ Status marked as `sent=True` to prevent duplicates

---

## 🔄 When Template Gets Approved

Once you have a custom approved template:

1. **Update the code** in `backend/exam/services/whatsapp_notification.py`:

```python
# Find the build_whatsapp_payload function (around line 67)
# Change this line:
"name": "jaspers_market_plain_text_v1",  # Old test template

# To:
"name": "your_approved_template_name",  # Your new template
```

2. **Adjust parameters** if your template has different placeholders

3. **Test in staging** first

4. **Deploy to production**

---

## 📞 Support

- **README**: See `WHATSAPP_NOTIFICATION_README.md` for detailed docs
- **Test Script**: Use `backend/test_whatsapp.py` for testing
- **Admin UI**: Check notification logs at `/admin/exam/notificationlog/`
- **Logs**: Check Celery and Django logs for errors

---

## ✨ Current Status

- ✅ Database models created and migrated
- ✅ Service layer implemented
- ✅ Integration with test completion flow
- ✅ Using test template: `jaspers_market_plain_text_v1`
- ✅ Idempotency and retry logic in place
- ✅ Admin interface available
- ✅ Test tools ready
- ⏳ Pending: Add production phone numbers
- ⏳ Pending: Get custom template approved
- ⏳ Pending: Enable in production

---

## 🎉 You're Ready!

The system is fully implemented and ready for testing. Just:
1. Set environment variables (Step 1)
2. Add phone number to an educator (Step 2)
3. Upload a test or run the test script (Step 4)
4. Check WhatsApp for the notification! 📱

**Happy Testing! 🚀**
