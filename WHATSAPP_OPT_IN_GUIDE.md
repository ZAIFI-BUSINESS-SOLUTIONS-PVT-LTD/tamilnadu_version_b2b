# WhatsApp Opt-In & Activation Flow - Implementation Guide

## Overview

This implementation adds a **compliant, one-time WhatsApp activation flow** that allows educators and managers to receive notifications even if they never initiate conversation with the business. This follows WhatsApp Business API best practices and solves the "24-hour window" limitation.

---

## 🎯 Problem Solved

**Before:** WhatsApp Business API requires users to message the business first before the business can send template messages. Without this initial interaction, messages are silently dropped.

**After:** Users explicitly opt-in during signup (or later in dashboard/profile), then complete a one-tap activation via `wa.me` link. Once activated, they can receive notifications indefinitely without needing to message again.

---

## 🏗️ Architecture

### Backend Changes

#### 1. **Database Schema (Models)**
Added to both `Educator` and `Manager` models:

```python
# Opt-in consent tracking
whatsapp_opt_in = BooleanField(default=False, null=True, blank=True)  # null = not asked yet
whatsapp_opt_in_timestamp = DateTimeField(null=True, blank=True)
whatsapp_consent_ip = CharField(max_length=45, blank=True, null=True)
whatsapp_consent_text = TextField(blank=True, null=True)

# Activation tracking (after first incoming message)
whatsapp_activated = BooleanField(default=False)
whatsapp_first_interaction_timestamp = DateTimeField(null=True, blank=True)
```

**Migration:** `exam.0015_educator_whatsapp_activated_and_more`

#### 2. **API Endpoints**

**`POST /api/whatsapp/opt-in/`** (Authenticated)
- Updates user opt-in status
- Stores consent metadata (text, IP, timestamp)
- Returns activation link if opted in but not activated

**`GET /api/whatsapp/status/`** (Authenticated)
- Returns user's current opt-in and activation status
- Returns `show_banner` flag for dashboard banner logic
- Returns `activation_link` if needed

**`POST /webhooks/whatsapp/`** (Public, signature-verified)
- Receives incoming WhatsApp messages from Meta
- Verifies X-Hub-Signature-256 using `WHATSAPP_APP_SECRET`
- Matches user by phone number or user ID in message text
- Sets `whatsapp_activated=True` on first message
- Sends welcome message (optional)

#### 3. **Notification Logic Updates**

**`send_whatsapp_notification` task** now checks:
1. `whatsapp_opt_in` must be `True`
2. `whatsapp_activated` must be `True`

If either is false, notification is **skipped** (logged, not sent). Applies to both educators and managers.

---

### Frontend Changes

#### 1. **Signup Form** (`educatorregister.jsx`)

Added fields:
- Phone number input (optional)
- WhatsApp opt-in checkbox (default checked)
- Success modal with "Enable WhatsApp Updates" button

Flow:
1. User signs up and checks opt-in box
2. On success, shows modal with `wa.me` link
3. Link opens WhatsApp with pre-filled message
4. User taps "Send" → activates account

#### 2. **Dashboard Banner** (`WhatsAppOptInBanner.jsx`)

Shows when:
- `whatsapp_opt_in` is `null` (never asked), OR
- `whatsapp_opt_in` is `true` but `whatsapp_activated` is `false`

Features:
- Dismissible (stored in `sessionStorage` per session)
- Inline opt-in checkbox
- Activation button (wa.me link)
- Clear instructions

#### 3. **Profile Settings** (`WhatsAppSettings.jsx`)

Permanent settings page showing:
- Current opt-in and activation status
- Toggle to enable/disable
- Activation link (if needed)
- Save button
- Explanation of how it works

---

## 🔐 Security & Compliance

### Consent Tracking
- Consent text, IP, and timestamp stored in database
- GDPR/data protection compliant
- Users can opt-out anytime (toggle in profile or reply STOP)

### Webhook Security
- Signature verification using `WHATSAPP_APP_SECRET`
- Reject requests with invalid signatures
- Idempotent (only activates once per user)

### Environment Variables
```bash
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=<access_token>
WHATSAPP_PHONE_ID=<phone_number_id>
WHATSAPP_API_VERSION=v22.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=inzighted_whatsapp_2026
WHATSAPP_APP_SECRET=<app_secret>
```

---

## 📋 Deployment Checklist

### 1. Backend Deployment

```bash
# Apply migrations
cd backend
python manage.py migrate

# Verify new fields exist
python manage.py shell
>>> from exam.models import Educator
>>> Educator._meta.get_fields()  # Should show whatsapp_* fields
```

### 2. Configure Webhook in Meta

1. Go to Meta Developer Console → WhatsApp → Configuration
2. Set Webhook URL: `https://yourdomain.com/webhooks/whatsapp/`
3. Set Verify Token: `inzighted_whatsapp_2026` (or your custom token)
4. Subscribe to `messages` events
5. Save and verify

### 3. Test Webhook

```bash
# Test verification (GET request)
curl "https://yourdomain.com/webhooks/whatsapp/?hub.mode=subscribe&hub.verify_token=inzighted_whatsapp_2026&hub.challenge=test123"
# Should return: test123

# Test incoming message (simulate Meta POST)
# Use Meta's webhook tester in Developer Console
```

### 4. Frontend Environment Variables

Add to `frontend/.env.development` and `frontend/.env.production`:

```bash
REACT_APP_WHATSAPP_PHONE_ID=915988834937783
```

### 5. Test End-to-End

1. **New User Signup:**
   - Sign up as new educator
   - Check opt-in box
   - Complete registration
   - Click "Enable WhatsApp Updates" in success modal
   - Send activation message in WhatsApp
   - Verify `whatsapp_activated=True` in database

2. **Existing User:**
   - Log in as existing educator
   - See dashboard banner (if not opted in)
   - Click opt-in checkbox
   - Click activation link
   - Send message
   - Verify activation in profile settings

3. **Notification Send:**
   - Upload test results for activated educator
   - Check Celery logs for WhatsApp task
   - Verify educator receives WhatsApp notification
   - Check `NotificationLog` for success

---

## 🧪 Testing Commands

### Check Migration Status
```bash
cd backend
python manage.py showmigrations exam | grep 0015
```

### Inspect User Status
```python
from exam.models import Educator
e = Educator.objects.get(email='test@example.com')
print(f"Opt-in: {e.whatsapp_opt_in}")
print(f"Activated: {e.whatsapp_activated}")
print(f"Phone: {e.phone_number}")
```

### Manually Activate User (for testing)
```python
from django.utils import timezone
from exam.models import Educator

e = Educator.objects.get(email='test@example.com')
e.whatsapp_opt_in = True
e.whatsapp_opt_in_timestamp = timezone.now()
e.whatsapp_activated = True
e.whatsapp_first_interaction_timestamp = timezone.now()
e.save()
```

### Test API Endpoints
```bash
# Get status
curl -H "Authorization: Bearer <token>" \
  https://yourdomain.com/api/whatsapp/status/

# Update opt-in
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"opt_in": true, "consent_text": "I agree..."}' \
  https://yourdomain.com/api/whatsapp/opt-in/
```

---

## 🐛 Troubleshooting

### Issue: Webhook not receiving messages
**Solution:**
- Verify webhook URL is publicly accessible
- Check Meta webhook subscription status
- Verify `WHATSAPP_APP_SECRET` matches Meta console
- Check server logs for signature verification errors

### Issue: User not activated after sending message
**Solution:**
- Check webhook logs for incoming message
- Verify phone number matches database format (+country code)
- Check if user ID is correctly embedded in message text
- Manually activate for testing (see commands above)

### Issue: Banner not showing
**Solution:**
- Clear `sessionStorage` in browser
- Check API response from `/api/whatsapp/status/`
- Verify `show_banner` logic in backend

### Issue: Notification still not sending
**Solution:**
- Check `NotificationLog` table for skip reason
- Verify both `whatsapp_opt_in=True` AND `whatsapp_activated=True`
- Check Celery worker logs
- Run `python manage.py check_whatsapp` (if command exists)

---

## 📊 Database Queries for Monitoring

### Count users by status
```sql
SELECT 
  COUNT(*) FILTER (WHERE whatsapp_opt_in IS NULL) AS not_asked,
  COUNT(*) FILTER (WHERE whatsapp_opt_in = false) AS opted_out,
  COUNT(*) FILTER (WHERE whatsapp_opt_in = true AND whatsapp_activated = false) AS opted_in_not_activated,
  COUNT(*) FILTER (WHERE whatsapp_opt_in = true AND whatsapp_activated = true) AS fully_activated
FROM exam_educator;
```

### Find users who opted in but haven't activated (need follow-up)
```sql
SELECT email, phone_number, whatsapp_opt_in_timestamp
FROM exam_educator
WHERE whatsapp_opt_in = true 
  AND whatsapp_activated = false
  AND whatsapp_opt_in_timestamp < NOW() - INTERVAL '7 days'
ORDER BY whatsapp_opt_in_timestamp DESC;
```

---

## 🔄 Rollback Plan

If issues occur:

1. **Disable notifications without code changes:**
   ```bash
   # In .env or .env.docker
   WHATSAPP_ENABLED=false
   ```
   Restart services. No messages will be sent.

2. **Revert database migration:**
   ```bash
   cd backend
   python manage.py migrate exam 0014  # Previous migration
   ```
   **Warning:** This drops the new WhatsApp fields.

3. **Revert code:**
   ```bash
   git revert <commit_hash>
   ```

---

## 📈 Future Enhancements

1. **Retry mechanism for non-activated users**
   - Send reminder email/SMS after 3 days if opted in but not activated

2. **Analytics dashboard**
   - Track activation rates
   - Monitor opt-in → activation funnel
   - A/B test consent text

3. **Multi-language support**
   - Localize consent text and activation messages

4. **Admin management UI**
   - View/export user WhatsApp status
   - Manually activate users
   - Send test notifications

---

## 📞 Support

For issues or questions:
1. Check logs: `backend/logs/` and Celery worker output
2. Check Sentry for exceptions
3. Review `NotificationLog` table for detailed error messages
4. Consult Meta WhatsApp Business API docs

---

**Status:** ✅ Production Ready  
**Backward Compatible:** ✅ Yes (all new fields nullable, feature flag controlled)  
**Breaking Changes:** ❌ None  
**Last Updated:** 2026-01-06
