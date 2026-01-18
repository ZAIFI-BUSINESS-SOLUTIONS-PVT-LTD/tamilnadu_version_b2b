from django.db import models

class StudentReport(models.Model):
    """
    Stores aggregated student report data for a specific test.
    This table provides quick access to computed metrics for reporting and analytics.
    """
    id = models.BigAutoField(primary_key=True)
    
    # Identifiers
    class_id = models.CharField(max_length=100, db_index=True)
    test_num = models.IntegerField(db_index=True)
    student_id = models.CharField(max_length=50, db_index=True)
    
    # Core metrics
    mark = models.FloatField(help_text="Student's score in this test")
    average = models.FloatField(help_text="Student's average score across all tests")
    improvement_rate = models.FloatField(help_text="Improvement rate compared to previous tests")
    
    # Subject-wise data (JSON format)
    subject_wise = models.JSONField(
        default=dict,
        help_text="Subject-wise correct/incorrect/skipped counts. Format: {subject: {correct: n, incorrect: n, skipped: n}}"
    )
    subject_wise_avg = models.JSONField(
        default=dict,
        help_text="Subject-wise average scores across all students in the class. Format: {subject: avg_score}"
    )
    
    # Subtopic recommendations (LLM-generated)
    subtopic_list = models.JSONField(
        default=dict,
        help_text="Top 6 subtopics per subject ranked by importance, with citations. Format: {subject: [{subtopic, rank, citations: [{test_num, question_num}]}]}"
    )
    
    # Subject-wise cumulative marks (NEW)
    sub_wise_marks = models.JSONField(
        default=dict,
        help_text="Cumulative marks per subject up to this test. Format: {subject: cumulative_marks}"
    )
    
    # Class vs Student analysis (NEW)
    class_vs_student = models.JSONField(
        default=list,
        help_text="Questions where class performed well but student failed. Format: [{question_num, correct_count, correct_option, student_option}]"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('class_id', 'test_num', 'student_id')
        ordering = ['-test_num', 'student_id']
        indexes = [
            models.Index(fields=['class_id', 'test_num']),
            models.Index(fields=['student_id', 'class_id']),
        ]
    
    def __str__(self):
        return f"{self.student_id} | {self.class_id} | Test {self.test_num} | Mark: {self.mark}"
