from django.db import models

class QuestionAnalysis(models.Model):
    class_id = models.CharField(max_length=50)
    test_num = models.IntegerField()
    chapter = models.TextField()
    topic = models.TextField()
    subtopic = models.TextField()
    subject = models.TextField()
    typeOfquestion = models.TextField()
    question_number = models.IntegerField()
    question_text = models.TextField()
    option_1 = models.TextField()
    option_2 = models.TextField()
    option_3 = models.TextField()
    option_4 = models.TextField()
    im_desp = models.TextField(null=True, blank=True)
    correct_answer = models.TextField()
    option_1_feedback = models.TextField()
    option_2_feedback = models.TextField()
    option_3_feedback = models.TextField()
    option_4_feedback = models.TextField()
    option_1_type =models.TextField(null=True, blank=True)
    option_2_type =models.TextField(null=True, blank=True)
    option_3_type =models.TextField(null=True, blank=True)
    option_4_type =models.TextField(null=True, blank=True)
    option_1_misconception = models.TextField(null=True, blank=True)
    option_2_misconception = models.TextField(null=True, blank=True)
    option_3_misconception = models.TextField(null=True, blank=True)
    option_4_misconception = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ('class_id', 'test_num', 'question_number')

    def __str__(self):
        return f"Analysis Q{self.question_number} - Class {self.class_id} Test {self.test_num}"
