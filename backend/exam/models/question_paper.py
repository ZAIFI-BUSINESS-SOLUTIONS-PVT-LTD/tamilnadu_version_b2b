from django.db import models

class QuestionPaper(models.Model):
    class_id = models.CharField(max_length=50)  # Identifies the class
    test_num = models.IntegerField()
    question_number = models.IntegerField()
    subject = models.CharField(max_length=255, null=True, blank=True)
    question_text = models.TextField()
    option_1 = models.TextField()
    option_2 = models.TextField()
    option_3 = models.TextField()
    option_4 = models.TextField()
    im_desp = models.TextField(null=True, blank=True)
    correct_answer = models.TextField()

    class Meta:
        unique_together = ('class_id', 'test_num', 'question_number', 'subject')  # Ensures uniqueness per class

    def __str__(self):
        return f"Q{self.question_number} ({self.subject}) - Test {self.test_num} (Class {self.class_id})"
