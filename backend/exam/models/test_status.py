from django.db import models

class TestProcessingStatus(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("PROCESSING", "Processing"),
        ("successful","Successful"),
        ("FAILED", "Failed"),
    ]

    class_id = models.CharField(max_length=255)
    test_num = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")
    logs = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(null=True)
    ended_at = models.DateTimeField(null=True)

    def __str__(self):
        return f"{self.class_id} - Test {self.test_num} [{self.status}]"
    class Meta:
        unique_together = ('test_num', 'class_id')
