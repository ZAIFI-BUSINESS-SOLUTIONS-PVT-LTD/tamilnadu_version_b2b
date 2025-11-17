from django.db import models

class Result(models.Model):
    id = models.BigAutoField(primary_key=True)  # 👈 Explicit primary key
    student_id = models.CharField(max_length=50)
    class_id = models.CharField(max_length=255)
    test_num = models.IntegerField()
    phy_total = models.IntegerField()
    phy_attended = models.IntegerField()
    phy_correct = models.IntegerField()
    phy_score = models.IntegerField()
    chem_total = models.IntegerField()
    chem_attended = models.IntegerField()
    chem_correct = models.IntegerField()
    chem_score = models.IntegerField()
    bot_total = models.IntegerField()
    bot_attended = models.IntegerField()
    bot_correct = models.IntegerField()
    bot_score = models.IntegerField()
    zoo_total = models.IntegerField()
    zoo_attended = models.IntegerField()
    zoo_correct = models.IntegerField()
    zoo_score = models.IntegerField()
    bio_total = models.IntegerField(default=0)
    bio_attended = models.IntegerField(default=0)
    bio_correct = models.IntegerField(default=0)
    bio_score = models.IntegerField(default=0)
    total_attended = models.IntegerField()
    total_correct = models.IntegerField()
    total_score = models.IntegerField()

    class Meta:
        unique_together = (
            'student_id',
            'class_id',
            'test_num',
        )

    def __str__(self):
        return f"{self.student_id} | {self.class_id} | Test {self.test_num} | {self.total_score}"

    def save(self, *args, **kwargs):
        # No need to calculate scores here; handled in analysis code before saving
        super().save(*args, **kwargs)

class StudentResult(models.Model):
    question_number = models.IntegerField()
    class_id = models.CharField(max_length=255)
    test_num = models.IntegerField()
    student_id = models.CharField(max_length=50)
    is_correct = models.BooleanField(default=False)
    subject = models.CharField(max_length=50)
    chapter = models.TextField()
    topic = models.TextField()

    class Meta:
        unique_together = (
            'question_number',
            'class_id',
            'test_num',
            'student_id',
        )