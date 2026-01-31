from django.db import models


class Institution(models.Model):
    """Simple institution table for domain-based white-label resolution.

    - `domain` is stored lowercased and unique. It is indexed for fast lookups.
    - `display_name` is a human-friendly name returned to the frontend.
    """

    id = models.BigAutoField(primary_key=True)
    domain = models.CharField(max_length=255, db_index=True)
    display_name = models.CharField(max_length=255)
    # Controls whether users of this institution should be redirected to the
    # institution domain after login from the gateway (web.inzighted.com).
    redirect_on_login = models.BooleanField(default=True)

    class Meta:
        db_table = 'exam_institution'
        verbose_name = 'Institution'
        verbose_name_plural = 'Institutions'

    def save(self, *args, **kwargs):
        # normalize domain to lowercase and trimmed form before saving
        if isinstance(self.domain, str):
            self.domain = self.domain.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.display_name} ({self.domain})"
