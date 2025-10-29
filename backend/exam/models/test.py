from django.db import models
from django.utils.timezone import now

class Test(models.Model):
    id = models.BigAutoField(primary_key=True)  # 👈 Explicit primary key
    class_id = models.CharField(max_length=50)
    test_num = models.IntegerField()
    date = models.DateTimeField(default=now) # ✅ Stores date with hours and minutes

    class Meta:
        unique_together = (
            'id',
            'class_id',
            'test_num',
        )

    def __str__(self):
        return f"Test {self.test_num} for Class {self.class_id} - {self.date.strftime('%Y-%m-%d %H:%M')}"
