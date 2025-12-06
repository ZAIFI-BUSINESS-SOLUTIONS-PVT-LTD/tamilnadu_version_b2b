from django.db import models
from django.utils import timezone


class PasswordResetRequest(models.Model):
    USER_ROLE_CHOICES = (
        ("educator", "Educator"),
        ("manager", "Manager"),
    )

    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(db_index=True)
    role = models.CharField(max_length=32, choices=USER_ROLE_CHOICES)
    token_hash = models.CharField(max_length=128, db_index=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["email", "role"]),
            models.Index(fields=["token_hash"]),
        ]

    def __str__(self):
        return f"PasswordResetRequest({self.email} role={self.role} used={self.used})"
