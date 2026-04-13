# WhatsApp Notification Feature

## Overview

Inzighted supports WhatsApp notifications for **Educators** and **Managers/Institutions**. The flow uses an explicit opt-in + one-tap activation via `wa.me` link to comply with WhatsApp Business API requirements (users must message the business first before templates can be sent to them).

---

## Architecture

### How It Works

1. User opts in (at signup or via dashboard/settings)
2. User clicks `wa.me` activation link → sends a WhatsApp message to the business number
3. Meta webhook fires → backend sets `whatsapp_activated = True`
4. From now on, Celery tasks can send notifications to this user

Both `whatsapp_opt_in = True` **and** `whatsapp_activated = True` are required before any message is sent. Either missing → notification is skipped (logged, not errored).

---

## Database Schema

Added to both `Educator` (`backend/exam/models/educator.py`) and `Manager` (`backend/exam/models/manager.py`):

```python
whatsapp_opt_in = BooleanField(default=False, null=True, blank=True)  # null = not yet asked
whatsapp_opt_in_timestamp = DateTimeField(null=True, blank=True)
whatsapp_consent_ip = CharField(max_length=45, blank=True, null=True)
whatsapp_consent_text = TextField(blank=True, null=True)
whatsapp_activated = BooleanField(default=False)
whatsapp_first_interaction_timestamp = DateTimeField(null=True, blank=True)
```

**Migration:** `exam.0015_educator_whatsapp_activated_and_more`

---

## API Endpoints

**File:** `backend/exam/views/whatsapp_views.py`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/whatsapp/opt-in/` | Required | Update consent; returns activation link |
| `GET` | `/api/whatsapp/status/` | Required | Get opt-in/activation status + `show_banner` flag |
| `POST` | `/webhooks/whatsapp/` | Public (signature-verified) | Receive incoming messages from Meta; sets `activated=True` |

**URLs:** `backend/inzighted/urls.py`

---

## Frontend Components

| File | Purpose |
|------|---------|
| `frontend/src/components/whatsapp/WhatsAppOptInBanner.jsx` | Dashboard banner (dismissible, shows when not yet activated) |
| `frontend/src/components/whatsapp/WhatsAppSettings.jsx` | Settings page widget (toggle, activation link, status) |
| `frontend/src/dashboards/educator/e_settings.jsx` | Educator settings page |
| `frontend/src/dashboards/institution/i_settings.jsx` | Institution/manager settings page |
| `frontend/src/auth/educator/educatorregister.jsx` | Signup form (opt-in checkbox + activation modal) |

### User Flows

**New signup:** Signup → check opt-in box → see success modal → click "Enable WhatsApp" → send in WhatsApp → activated

**Existing user:** Login → see dashboard banner → check opt-in → click activation link → send in WhatsApp → activated

**Settings page:** Navigate to `/educator/settings` or `/institution/settings` → toggle → save → done

---

## Notification Logic

**File:** `backend/exam/services/whatsapp_notification.py`

- `WhatsAppConfig` class: holds credentials, validates config via `validate_config()`, masks token in logs via `get_masked_token()`
- `format_phone_number()`: E.164 validation with min/max length check
- `send_whatsapp_notification()`: Celery task; checks opt-in + activated; skips gracefully with log entry if either is false
- Template: `results_update` (3 body params), language `en_US`

**Notification log:** `NotificationLog` model tracks all send attempts (success + skip/fail reasons).

---

## Environment Variables

### Backend
```bash
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=<access_token_from_meta>
WHATSAPP_PHONE_ID=<meta_phone_number_id>       # Used for sending messages via API
WHATSAPP_BUSINESS_PHONE=917984113438           # Actual phone number for wa.me links
WHATSAPP_API_VERSION=v22.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=inzighted_whatsapp_2026
WHATSAPP_APP_SECRET=<app_secret_from_meta>
WABA_ID=2049886399146120
```

### Frontend
```bash
REACT_APP_WHATSAPP_BUSINESS_PHONE=917984113438
```

> `WHATSAPP_PHONE_ID` = Meta API phone number ID (for sending).
> `WHATSAPP_BUSINESS_PHONE` = actual phone number digits (for `wa.me` links).

---

## Meta Webhook Setup

1. Go to Meta Developer Console → WhatsApp → Configuration → Webhooks
2. Callback URL: `https://yourdomain.com/webhooks/whatsapp/`
3. Verify Token: value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to: `messages`
5. Copy App Secret → add as `WHATSAPP_APP_SECRET`

---

## Deployment Checklist

```bash
# 1. Apply migration
cd backend && python manage.py migrate

# 2. Verify fields
python manage.py shell
>>> from exam.models import Educator
>>> Educator._meta.get_fields()  # should include whatsapp_* fields

# 3. Verify webhook (GET)
curl "https://yourdomain.com/webhooks/whatsapp/?hub.mode=subscribe&hub.verify_token=inzighted_whatsapp_2026&hub.challenge=test123"
# Expected: test123

# 4. Health check
python manage.py check_whatsapp
python manage.py check_whatsapp --strict  # fails on bad config (use in CI)
```

---

## Testing

```bash
# Check user status
curl -H "Authorization: Bearer <token>" https://yourdomain.com/api/whatsapp/status/

# Update opt-in
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"opt_in": true, "consent_text": "I agree to receive WhatsApp notifications"}' \
  https://yourdomain.com/api/whatsapp/opt-in/
```

```python
# Django shell: manually activate a user for testing
from django.utils import timezone
from exam.models import Educator

e = Educator.objects.get(email='test@example.com')
e.whatsapp_opt_in = True
e.whatsapp_opt_in_timestamp = timezone.now()
e.whatsapp_activated = True
e.whatsapp_first_interaction_timestamp = timezone.now()
e.save()
```

---

## Monitoring

```python
# Count users by status
from exam.models import Educator
print(f"Opted in: {Educator.objects.filter(whatsapp_opt_in=True).count()}")
print(f"Activated: {Educator.objects.filter(whatsapp_activated=True).count()}")
```

```sql
-- Full breakdown
SELECT
  COUNT(*) FILTER (WHERE whatsapp_opt_in IS NULL)                                AS not_asked,
  COUNT(*) FILTER (WHERE whatsapp_opt_in = false)                                AS opted_out,
  COUNT(*) FILTER (WHERE whatsapp_opt_in = true AND whatsapp_activated = false)  AS pending_activation,
  COUNT(*) FILTER (WHERE whatsapp_opt_in = true AND whatsapp_activated = true)   AS fully_active
FROM exam_educator;

-- Users opted in but not activated > 7 days ago (need follow-up)
SELECT email, phone_number, whatsapp_opt_in_timestamp
FROM exam_educator
WHERE whatsapp_opt_in = true
  AND whatsapp_activated = false
  AND whatsapp_opt_in_timestamp < NOW() - INTERVAL '7 days';
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Webhook not receiving messages | Verify URL is public; check Meta subscription status; confirm `WHATSAPP_APP_SECRET` |
| User not activated after sending message | Check phone number format in DB (+country code); check webhook logs for signature errors |
| Banner not showing | Clear `sessionStorage`; inspect `/api/whatsapp/status/` response |
| Notifications not sending | Check `NotificationLog` for skip reason; confirm both `opt_in=True` AND `activated=True`; check Celery worker logs |

---

## Rollback

```bash
# Disable without code change
WHATSAPP_ENABLED=false  # in .env — restart services

# Revert migration (drops whatsapp_* fields — destructive)
cd backend && python manage.py migrate exam 0014
```

---

## Security & Compliance

- Webhook signature verified via HMAC-SHA256 (`X-Hub-Signature-256`)
- Consent text, IP, and timestamp stored in DB (GDPR-compliant)
- Token never logged in full (`get_masked_token()`)
- Users can opt-out anytime (dashboard toggle or reply STOP)
- All new fields are nullable — fully backward compatible with existing users
