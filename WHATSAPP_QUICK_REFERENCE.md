# WhatsApp Implementation - Quick Reference

## 🎯 What Was Done

**Problem:** WhatsApp requires users to message business first before business can send templates.

**Solution:** Explicit opt-in + one-tap activation flow via `wa.me` link.

**Coverage:** ✅ Both Educators AND Managers/Institutions

---

## 📍 Key Locations

### Backend
- **Models:** `backend/exam/models/educator.py`, `manager.py`
- **APIs:** `backend/exam/views/whatsapp_views.py`
- **Notification Logic:** `backend/exam/services/whatsapp_notification.py`
- **URLs:** `backend/inzighted/urls.py`

### Frontend
- **Banner:** `frontend/src/components/whatsapp/WhatsAppOptInBanner.jsx`
- **Settings:** `frontend/src/components/whatsapp/WhatsAppSettings.jsx`
- **Educator Settings Page:** `frontend/src/dashboards/educator/e_settings.jsx`
- **Institution Settings Page:** `frontend/src/dashboards/institution/i_settings.jsx`
- **Signup:** `frontend/src/auth/educator/educatorregister.jsx`

---

## 🔌 API Endpoints

```
POST   /api/whatsapp/opt-in/      - Update consent (authenticated)
GET    /api/whatsapp/status/      - Get user status (authenticated)
POST   /webhooks/whatsapp/         - Receive incoming messages (public, verified)
```

---

## 🌐 Frontend Routes

```
/educator/settings      - Educator WhatsApp preferences
/institution/settings   - Manager WhatsApp preferences
```

Sidebar: Settings link added to both educator and institution navigation.

---

## 🔑 Environment Variables

### Backend
```bash
WHATSAPP_WEBHOOK_VERIFY_TOKEN=inzighted_whatsapp_2026
WHATSAPP_APP_SECRET=<from_meta_console>
WHATSAPP_BUSINESS_PHONE=917984113438  # Actual WhatsApp number for wa.me links
```

### Frontend
```bash
REACT_APP_WHATSAPP_BUSINESS_PHONE=917984113438  # Same as backend
```

**Important:** `WHATSAPP_PHONE_ID` is the Meta API Phone Number ID (used for sending messages), while `WHATSAPP_BUSINESS_PHONE` is the actual phone number (used in wa.me activation links).

---

## 🧪 Quick Test

### 1. Check Migration
```bash
cd backend && python manage.py showmigrations exam | grep 0015
```

### 2. Test API
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/whatsapp/status/
```

### 3. Test Webhook
```bash
curl "http://localhost:8000/webhooks/whatsapp/?hub.mode=subscribe&hub.verify_token=inzighted_whatsapp_2026&hub.challenge=test"
# Should return: test
```

### 4. Frontend Check
1. Sign up as new educator → see opt-in checkbox + success modal
2. Log in as existing user → see dashboard banner
3. Navigate to Settings → see WhatsApp section

---

## 🎬 User Flow Summary

**New Signup:**  
Signup → Check box → Success modal → Click "Enable WhatsApp" → Send in WhatsApp → Activated ✅

**Existing User:**  
Login → See banner → Check box → Click "Enable WhatsApp" → Send in WhatsApp → Activated ✅

**Settings:**  
Navigate to Settings → Toggle on/off → Click activation link (if needed) → Save → Done ✅

---

## ⚠️ Important Notes

1. **Both educators AND managers** have full WhatsApp opt-in support
2. **Notifications only sent** if `opt_in=True` AND `activated=True`
3. **Non-activated users skipped** gracefully (logged in NotificationLog)
4. **Backward compatible** - all fields nullable, existing users unaffected
5. **Feature flag** - disable via `WHATSAPP_ENABLED=false`

---

## 🚨 Meta Webhook Setup Required

1. Go to Meta Developer Console → WhatsApp
2. Configuration → Webhooks
3. Set URL: `https://yourdomain.com/webhooks/whatsapp/`
4. Set Verify Token: `inzighted_whatsapp_2026`
5. Subscribe to: `messages`
6. Get App Secret and add to `.env`

---

## 📊 Monitoring

### Count Users by Status
```python
from exam.models import Educator
opted_in = Educator.objects.filter(whatsapp_opt_in=True).count()
activated = Educator.objects.filter(whatsapp_activated=True).count()
print(f"Opted in: {opted_in}, Activated: {activated}")
```

### Check Recent Skips
```python
from exam.models import NotificationLog
skipped = NotificationLog.objects.filter(sent=False, error__icontains='not activated')[:10]
for log in skipped:
    print(f"{log.educator.email}: {log.error}")
```

---

## 📚 Full Documentation

See `WHATSAPP_OPT_IN_GUIDE.md` for:
- Complete architecture
- Deployment checklist
- Troubleshooting guide
- Database queries
- Security details

See `WHATSAPP_IMPLEMENTATION_SUMMARY.md` for:
- All files changed
- Testing checklist
- Verification commands

---

**Status:** ✅ Complete  
**Date:** 2026-01-06  
**Works For:** Educators + Managers/Institutions
