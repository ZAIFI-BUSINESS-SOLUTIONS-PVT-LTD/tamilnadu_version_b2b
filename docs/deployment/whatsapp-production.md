# WhatsApp — Production Deployment

## Environment Variables

Set in `.env` and `.env.docker`:

```bash
WHATSAPP_ENABLED=true
WHATSAPP_TOKEN=<access_token_from_meta>
WHATSAPP_PHONE_ID=915988834937783         # Meta API Phone Number ID (for sending)
WABA_ID=2049886399146120
WHATSAPP_API_VERSION=v22.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=inzighted_whatsapp_2026
WHATSAPP_APP_SECRET=<app_secret_from_meta>
WHATSAPP_BUSINESS_PHONE=917984113438      # Actual phone digits (for wa.me links)
```

Template: `results_update` (3 body params: educator name, test name, dashboard URL), language `en_US`.

---

## Deployment Steps

### 1. Apply Migration
```bash
cd backend
python manage.py migrate
python manage.py showmigrations exam | grep 0015  # verify applied
```

### 2. Validate Configuration
```bash
python manage.py check_whatsapp
python manage.py check_whatsapp --strict  # use in CI/CD — fails on bad config
```

Expected output:
```
✅ WhatsApp is ENABLED
✅ Configuration is VALID
Ready to send WhatsApp notifications!
```

### 3. Configure Meta Webhook
1. Meta Developer Console → WhatsApp → Configuration → Webhooks
2. Callback URL: `https://yourdomain.com/webhooks/whatsapp/`
3. Verify Token: value of `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
4. Subscribe to: `messages`

Test webhook verification:
```bash
curl "https://yourdomain.com/webhooks/whatsapp/?hub.mode=subscribe&hub.verify_token=inzighted_whatsapp_2026&hub.challenge=test123"
# Expected: test123
```

### 4. Restart Services

Both web app AND Celery workers must be restarted to load new env vars:

```bash
# Docker
docker-compose down && docker-compose up -d --build

# Systemd
sudo systemctl restart gunicorn
sudo systemctl restart celery-worker
```

### 5. Monitor Logs
```bash
tail -f logs/celery.log | grep WhatsApp
# Look for: ✅ WhatsApp sent successfully | 📱 Scheduling notification | ❌ API error
```

---

## Production Monitoring

```python
from exam.models import NotificationLog

# Recent notifications
NotificationLog.objects.order_by('-created_at')[:10]

# Failed notifications
NotificationLog.objects.filter(sent=False)

# Retry failed
from exam.services.whatsapp_notification import retry_failed_notifications
retry_failed_notifications.delay()
retry_failed_notifications.delay(class_id='A1', test_num=1)  # specific class/test
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| API error 400 | Token may be expired; verify phone number format; check template name matches approved |
| "No phone number" | Set `phone_number` on Educator via Django admin |
| Messages not sending | Check Celery workers: `celery -A inzighted --workdir backend inspect active`; check Redis |
| "Configuration invalid" | Run `check_whatsapp`; verify all env vars loaded (`echo $WHATSAPP_TOKEN`) |

---

## Rollback

```bash
# Disable without code change (safest)
WHATSAPP_ENABLED=false   # in .env — restart services

# Revert migration (drops whatsapp_* fields — destructive)
cd backend && python manage.py migrate exam 0014
```

---

## CI/CD Integration

```yaml
steps:
  - name: Validate WhatsApp Config
    run: cd backend && python manage.py check_whatsapp --strict
```
