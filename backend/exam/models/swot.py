from django.db import models
 
class SWOT(models.Model):
    id = models.BigAutoField(primary_key=True)  # Auto-generated unique row ID
 
    user_id = models.CharField(max_length=200)
    class_id = models.CharField(max_length=200)
    test_num = models.IntegerField()
 
    swot_parameter = models.CharField(max_length=100)  # e.g., S_BPT, T_IP, etc.
    swot_value = models.TextField()     # e.g., topic name or tag
 
    class Meta:
        unique_together = (
            'user_id',
            'class_id',
            'test_num',
            'swot_parameter',
        )
 
    def __str__(self):
        return f"{self.user_id} | {self.class_id} | Test {self.test_num} | {self.swot_parameter}: {self.swot_value}"