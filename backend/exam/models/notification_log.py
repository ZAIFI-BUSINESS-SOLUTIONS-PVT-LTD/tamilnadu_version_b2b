from django.db import models
from django.utils.timezone import now


class NotificationLog(models.Model):
    """
    Tracks WhatsApp notifications sent to educators.
    Ensures idempotency and prevents spam by recording all notification attempts.
    """
    
    NOTIFICATION_TYPE_CHOICES = [
        ('TEST_COMPLETE', 'Test Processing Complete'),
        ('TEST_FAILED', 'Test Processing Failed'),
    ]
    
    class_id = models.CharField(max_length=255)
    test_num = models.IntegerField()
    educator = models.ForeignKey('Educator', on_delete=models.SET_NULL, null=True, blank=True)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPE_CHOICES, default='TEST_COMPLETE')
    
    # Status tracking
    sent = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    
    # WhatsApp API details
    phone_number = models.CharField(max_length=20)
    payload = models.JSONField(blank=True, null=True)
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('class_id', 'test_num', 'notification_type')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['class_id', 'test_num']),
            models.Index(fields=['educator']),
            models.Index(fields=['sent']),
        ]
    
    def __str__(self):
        status = "✅ Sent" if self.sent else "⏳ Pending"
        return f"{status} - {self.notification_type} for {self.class_id} Test {self.test_num}"
