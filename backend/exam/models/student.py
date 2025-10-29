from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class Student(models.Model):
    id = models.BigAutoField(primary_key=True)
    student_id = models.CharField(max_length=50)
    name = models.CharField(max_length=100)
    dob = models.DateField()
    class_id = models.CharField(max_length=200)
    password = models.CharField(max_length=255)  # ✅ Storing hashed passwords
    neo4j_db = models.CharField(max_length=100)
    independant = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student_id', 'class_id')  # Ensures uniqueness per class

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
        """Ensure password is hashed only on first-time save."""
        if self.password and not self.password.startswith('pbkdf2_sha256$'):
            self.password = make_password(self.password)

        super().save(*args, **kwargs)
        
    def __str__(self):
        return f"{self.name} ({self.dob}) - Class {self.class_id}"
