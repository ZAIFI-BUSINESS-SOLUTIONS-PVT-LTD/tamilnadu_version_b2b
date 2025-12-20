import secrets
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from exam.models import Educator, Manager
from exam.models.password_reset import PasswordResetRequest
from exam.utils.email_tasks import send_password_reset_email
import hmac
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def _generate_token_and_hash() -> (str, str):
    raw = secrets.token_urlsafe(48)
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, digest


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


@api_view(["POST"])
def forgot_password(request):
    """Create a password reset request and enqueue an email.

    Body: { "email": "user@example.com" }
    Response: Generic success message regardless of whether user exists.
    """
    email = _normalize_email(request.data.get("email"))
    if not email:
        return Response({"detail": "If that account exists, an email will be sent."}, status=status.HTTP_200_OK)

    # Determine role: educator or manager (institution)
    role = None
    user = None
    try:
        user = Educator.objects.get(email=email)
        role = "educator"
    except Educator.DoesNotExist:
        try:
            user = Manager.objects.get(email=email)
            role = "manager"
        except Manager.DoesNotExist:
            user = None
            role = None

    # Create token record only if user exists; but still return generic response
    if user:
        raw_token, token_hash = _generate_token_and_hash()
        expires_at = timezone.now() + timedelta(minutes=int(getattr(settings, "PASSWORD_RESET_TTL_MINUTES", 30)))

        PasswordResetRequest.objects.create(
            email=email,
            role=role,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        # Build reset link and enqueue email
        frontend_url = getattr(settings, "FRONTEND_RESET_URL", "")
        if frontend_url:
            reset_link = f"{frontend_url}?email={email}&token={raw_token}&role={role}"
        else:
            # fallback to an API-based flow where frontend POSTs token
            reset_link = raw_token

        recipient_name = getattr(user, "name", "")
        # Log enqueue time for diagnostics
        logging.getLogger(__name__).info("Enqueuing password reset email for %s at %s", email, timezone.now())
        send_password_reset_email.delay(email, reset_link, recipient_name)

    # Always respond with generic message
    return Response({"detail": "If that account exists, password reset instructions have been sent."}, status=status.HTTP_200_OK)


@api_view(["POST"])
def reset_password(request):
    """Consume token and reset password.

    Body: { "email": "...", "token": "...", "new_password": "...", "role": "educator|manager" }
    """
    email = _normalize_email(request.data.get("email"))
    token = request.data.get("token")
    new_password = request.data.get("new_password")
    role = request.data.get("role")

    if not (email and token and new_password):
        return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

    # No minimum-length policy enforced here per request — accept any password provided by user

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    try:
        # Find matching reset request (no lock yet). We'll acquire a FOR UPDATE lock inside
        # the transaction block below to atomically consume the token.
        pr = PasswordResetRequest.objects.get(token_hash=token_hash, email=email, used=False)
    except PasswordResetRequest.DoesNotExist:
        return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

    now = timezone.now()
    if pr.expires_at < now:
        return Response({"error": "Token expired"}, status=status.HTTP_400_BAD_REQUEST)

    # If role provided, ensure it matches stored role
    if role and pr.role != role:
        return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)

    # Perform atomic consume + password update
    with transaction.atomic():
        # re-fetch for update
        pr = PasswordResetRequest.objects.select_for_update().get(pk=pr.pk)
        if pr.used:
            return Response({"error": "Token already used"}, status=status.HTTP_400_BAD_REQUEST)

        # update user password
        if pr.role == "educator":
            try:
                user = Educator.objects.get(email=email)
            except Educator.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                user = Manager.objects.get(email=email)
            except Manager.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        # Set password using model helper
        user.set_password(new_password)

        # mark token used
        pr.used = True
        pr.save(update_fields=["used"]) 

    return Response({"detail": "Password has been reset"}, status=status.HTTP_200_OK)
