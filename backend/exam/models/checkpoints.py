"""
Checkpoints model for storing combined checklist + action plan insights.
Stores test-wise and overall performance insights as JSON.
"""
from django.db import models


class Checkpoints(models.Model):
    """
    Stores combined checklist and action plan insights for a student per test.
    Each insight contains both the problem (checklist) and the solution (action plan).
    """
    class_id = models.CharField(max_length=255)
    student_id = models.CharField(max_length=50)
    test_num = models.IntegerField()
    insights = models.JSONField(
        help_text="JSON array of checkpoint objects, each with checklist and action_plan fields"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exam_checkpoints'
        unique_together = ('class_id', 'student_id', 'test_num')
        indexes = [
            models.Index(fields=['student_id', 'class_id']),
            models.Index(fields=['test_num']),
        ]

    def __str__(self):
        return f"Checkpoints: {self.student_id} | {self.class_id} | Test {self.test_num}"
