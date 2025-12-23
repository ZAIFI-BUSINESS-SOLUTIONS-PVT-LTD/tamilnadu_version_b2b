from django.db import models

class Feedback(models.Model):
    id = models.BigAutoField(primary_key=True)  # Auto-generated unique row ID

    user_id = models.CharField(max_length=200)
    class_id = models.CharField(max_length=200)
    
    feedback_value = models.JSONField()  # Stores flexible feedback form data as JSON

    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp when feedback was submitted
    updated_at = models.DateTimeField(auto_now=True)  # Timestamp when feedback was last updated

    class Meta:
        db_table = 'exam_feedback'
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback from {self.user_id} | Class {self.class_id}"
