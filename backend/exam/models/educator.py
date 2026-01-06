from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class Educator(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    dob = models.DateField()
    class_id = models.CharField(max_length=50)
    institution = models.CharField(max_length=255)
    password = models.CharField(max_length=255)  # ✅ Storing hashed passwords
    separate_biology_subjects = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # For WhatsApp notifications
    
    # WhatsApp opt-in and activation tracking
    whatsapp_opt_in = models.BooleanField(default=False, null=True, blank=True)  # null = not asked yet, False = declined, True = accepted
    whatsapp_opt_in_timestamp = models.DateTimeField(null=True, blank=True)
    whatsapp_consent_ip = models.CharField(max_length=45, blank=True, null=True)  # IPv4 or IPv6
    whatsapp_consent_text = models.TextField(blank=True, null=True)  # Exact consent text shown
    whatsapp_activated = models.BooleanField(default=False)  # True after first incoming WhatsApp message
    whatsapp_first_interaction_timestamp = models.DateTimeField(null=True, blank=True)


    CSV_STATUS_CHOICES = [
    ("pending", "Pending"),
    ("started", "Started"),
    ("completed", "Completed"),
    ("failed", "Failed"),
    ]

    csv_status = models.CharField(max_length=10, choices=CSV_STATUS_CHOICES, default="pending")
     
    def set_password(self, raw_password):
        """Hashes and sets the password securely."""
        self.password = make_password(raw_password)
        
        # ✅ Ensure the object exists before calling `update_fields`
        if self.pk:
            self.save(update_fields=["password"])
        else:
            self.save()  # ✅ Save normally if it's a new record

    def check_password(self, raw_password):
        """Checks if the given password matches the stored hash."""
        return check_password(raw_password, self.password)

    def save(self, *args, **kwargs):
        """Ensure password is hashed only when it's a raw password."""
        if self.password and not self.password.startswith('pbkdf2_sha256$'):
            self.password = make_password(self.password)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.email}) - Class {self.class_id}"
