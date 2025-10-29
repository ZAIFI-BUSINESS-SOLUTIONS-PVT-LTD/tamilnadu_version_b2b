from django.db import models
 
class Overview(models.Model):
    id = models.BigAutoField(primary_key=True)
 
    user_id = models.CharField(max_length=50)
    class_id = models.CharField(max_length=100)
 
    metric_name = models.CharField(max_length=100)     # e.g., OP, IR, TT, etc.
    metric_value = models.TextField()    # e.g., metric value or descriptor
 
    class Meta:
        unique_together = (
            'user_id',
            'class_id',
            'metric_name',
        )
 
    def __str__(self):
        return f"{self.user_id} | {self.class_id} | {self.metric_name}: {self.metric_value}"