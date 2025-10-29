from django.db import models

class StudentResponse(models.Model):
    student_id = models.CharField(max_length=50)  # Unique Student Identifier
    class_id = models.CharField(max_length=50)  # Class Identifier
    test_num = models.IntegerField()  # Test Number
    question_number = models.IntegerField()  # Question Number in the Test
    selected_answer = models.CharField(max_length=10, null=True, blank=True)  # Student's Answer

    class Meta:
        unique_together = ('student_id', 'class_id', 'test_num', 'question_number')

    def __str__(self):
        return f"Student {self.student_id} - Test {self.test_num} - Q{self.question_number}"
