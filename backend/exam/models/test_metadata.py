from django.db import models
from django.utils.timezone import now

class TestMetadata(models.Model):
    """
    Stores admin-provided subject pattern, order, and question counts for a test.
    Used to optimize question extraction and avoid unnecessary LLM calls.
    """
    PATTERN_CHOICES = [
        ('PHY_CHEM_BOT_ZOO', 'Physics → Chemistry → Botany → Zoology'),
        ('PHY_CHEM_BIO', 'Physics → Chemistry → Biology'),
    ]
    
    id = models.BigAutoField(primary_key=True)
    class_id = models.CharField(max_length=50)
    test_num = models.IntegerField()
    
    # Pattern selection
    pattern = models.CharField(max_length=50, choices=PATTERN_CHOICES)
    
    # Ordered list of subject names (JSON array)
    # Example: ["Physics", "Chemistry", "Botany", "Zoology"]
    subject_order = models.JSONField()
    
    # Optional: explicit count per subject (JSON object)
    # Example: {"Physics": 45, "Chemistry": 45, "Botany": 45, "Zoology": 45}
    section_counts = models.JSONField(null=True, blank=True)
    
    # Total questions (required)
    total_questions = models.IntegerField()
    
    # Metadata
    created_at = models.DateTimeField(default=now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('class_id', 'test_num')
        db_table = 'exam_test_metadata'
    
    def __str__(self):
        return f"TestMetadata: {self.class_id} | Test {self.test_num} | {self.pattern}"
    
    def get_subject_ranges(self):
        """
        Calculate question number ranges for each subject based on counts or total.
        Returns list of dicts: [{"subject": "Physics", "start": 1, "end": 45}, ...]
        """
        if self.section_counts:
            # Use explicit counts
            ranges = []
            current = 1
            for subject in self.subject_order:
                count = self.section_counts.get(subject, 0)
                if count > 0:
                    ranges.append({
                        "subject": subject,
                        "start": current,
                        "end": current + count - 1,
                        "count": count
                    })
                    current += count
            return ranges
        else:
            # Equal distribution
            num_subjects = len(self.subject_order)
            if num_subjects == 0:
                return []
            
            base_count = self.total_questions // num_subjects
            remainder = self.total_questions % num_subjects
            
            ranges = []
            current = 1
            for i, subject in enumerate(self.subject_order):
                # Last subject gets the remainder
                count = base_count + (remainder if i == num_subjects - 1 else 0)
                ranges.append({
                    "subject": subject,
                    "start": current,
                    "end": current + count - 1,
                    "count": count
                })
                current += count
            return ranges
