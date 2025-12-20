from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from celery import shared_task
from django.template.loader import render_to_string
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email(self, to_email: str, reset_link: str, recipient_name: str = None):
    """Send password reset email asynchronously via Celery.

    Uses Django's `EmailMultiAlternatives` and a simple HTML/text template.
    """
    try:
        start_ts = timezone.now()
        logger.info("send_password_reset_email started for %s at %s", to_email, start_ts)

        subject = "Inzighted: Password reset instructions"
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@inzighted.com")

        context = {
            "reset_link": reset_link,
            "recipient_name": recipient_name or "",
            "frontend_reset_url": getattr(settings, "FRONTEND_RESET_URL", ""),
        }

        text_body = render_to_string("emails/password_reset.txt", context)
        html_body = render_to_string("emails/password_reset.html", context)

        msg = EmailMultiAlternatives(subject, text_body, from_email, [to_email])
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        end_ts = timezone.now()
        logger.info("Password reset email sent to %s (task start %s end %s)", to_email, start_ts, end_ts)
    except Exception as exc:
        logger.exception("Failed to send password reset email")
        raise self.retry(exc=exc)
