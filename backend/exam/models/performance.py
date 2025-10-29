from django.db import models
 
class Performance(models.Model):
    id = models.BigAutoField(primary_key=True)
 
    user_id = models.CharField(max_length=50)
    class_id = models.CharField(max_length=100)
    subject = models.TextField()
 
    metric_name = models.CharField(max_length=200)      # e.g., ST, CT, SI, CI
    metric_value = models.TextField()     # Detailed metric description or score
 
    class Meta:
        unique_together = (
            'user_id',
            'class_id',
            'subject',
            'metric_name',
        )
 
    def __str__(self):
        return f"{self.user_id} | {self.class_id} | {self.metric_name}: {self.metric_value}"