from django.db import models
from django.contrib.postgres.fields import ArrayField


class Teacher(models.Model):
    """
    Stores teacher information for a specific class and subject.
    test_range stores a list of test numbers (e.g., [5, 6, 7]) to track which tests this teacher handled.
    """
    id = models.BigAutoField(primary_key=True)
    class_id = models.CharField(max_length=50)
    subject = models.CharField(max_length=200)
    teacher_name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    test_range = ArrayField(
        models.IntegerField(),
        blank=True,
        null=True,
        help_text="List of test numbers this teacher handled (e.g., [5, 6, 7])"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teacher'
        # Optionally enforce uniqueness per class+subject+teacher to avoid duplicates
        # unique_together = ('class_id', 'subject', 'teacher_name')

    def __str__(self):
        return f"{self.teacher_name} - {self.subject} (Class {self.class_id})"
