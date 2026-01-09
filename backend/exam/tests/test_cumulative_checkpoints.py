"""
Unit tests for cumulative checkpoints functionality.
Tests data retrieval, LLM generation, and storage.
"""
import json
from django.test import TestCase
from unittest.mock import patch, MagicMock
from exam.models.result import StudentResult
from exam.models.checkpoints import Checkpoints
from exam.graph_utils.retrieve_cumulative_checkpoints_data import (
    get_cumulative_checkpoints_data,
    parse_misconception_field
)
from exam.services.checkpoint_task import populate_checkpoints_cumulative


class CumulativeCheckpointsTestCase(TestCase):
    """Test cumulative checkpoint generation and storage"""
    
    def setUp(self):
        """Set up test data"""
        self.student_id = "TEST_STUDENT_001"
        self.class_id = "TEST_CLASS_2024"
        
        # Create sample StudentResult records (wrong answers)
        StudentResult.objects.create(
            student_id=self.student_id,
            class_id=self.class_id,
            test_num=1,
            question_number=5,
            subject="Physics",
            chapter="Laws of Motion",
            topic="Newton's Laws",
            is_correct=False,
            was_attempted=True,
            misconception=json.dumps({
                "misconception_type": "conceptual",
                "misconception_text": "Assumed action and reaction forces act on the same object"
            })
        )
        
        StudentResult.objects.create(
            student_id=self.student_id,
            class_id=self.class_id,
            test_num=2,
            question_number=7,
            subject="Physics",
            chapter="Laws of Motion",
            topic="Newton's Laws",
            is_correct=False,
            was_attempted=True,
            misconception=json.dumps({
                "misconception_type": "conceptual",
                "misconception_text": "Believed equal and opposite forces result in zero net force"
            })
        )
        
        # Add some correct answers for accuracy calculation
        StudentResult.objects.create(
            student_id=self.student_id,
            class_id=self.class_id,
            test_num=1,
            question_number=1,
            subject="Physics",
            chapter="Laws of Motion",
            topic="Newton's Laws",
            is_correct=True,
            was_attempted=True
        )
    
    def test_parse_misconception_field_json(self):
        """Test parsing misconception from JSON format"""
        json_data = json.dumps({
            "misconception_type": "formula confusion",
            "misconception_text": "Used wrong formula for momentum"
        })
        misc_type, misc_text = parse_misconception_field(json_data)
        self.assertEqual(misc_type, "formula confusion")
        self.assertEqual(misc_text, "Used wrong formula for momentum")
    
    def test_parse_misconception_field_plain_text(self):
        """Test parsing misconception from plain text"""
        plain_text = "Conceptual: Confused mass and weight"
        misc_type, misc_text = parse_misconception_field(plain_text)
        self.assertEqual(misc_type, "conceptual")
        self.assertEqual(misc_text, "Confused mass and weight")
    
    def test_get_cumulative_checkpoints_data(self):
        """Test cumulative data retrieval"""
        data = get_cumulative_checkpoints_data(self.student_id, self.class_id)
        
        self.assertIn('topics', data)
        self.assertGreater(len(data['topics']), 0)
        
        # Check structure of first topic
        topic = data['topics'][0]
        self.assertIn('topic_metadata', topic)
        self.assertIn('wrong_questions_by_test', topic)
        
        # Check metadata fields
        metadata = topic['topic_metadata']
        self.assertIn('subject', metadata)
        self.assertIn('topic', metadata)
        self.assertIn('accuracy', metadata)
        self.assertIn('improvement_rate', metadata)
        
        # Check wrong questions structure
        wrong_by_test = topic['wrong_questions_by_test']
        self.assertGreater(len(wrong_by_test), 0)
        self.assertIn('test_id', wrong_by_test[0])
        self.assertIn('wrong_questions', wrong_by_test[0])
        
        # Check individual wrong question structure
        wrong_q = wrong_by_test[0]['wrong_questions'][0]
        self.assertIn('question_number', wrong_q)
        self.assertIn('misconception_type', wrong_q)
        self.assertIn('misconception_text', wrong_q)
    
    @patch('exam.llm_call.checkpoint_generator.generate_cumulative_checkpoints')
    def test_populate_checkpoints_cumulative_task(self, mock_generate):
        """Test Celery task stores data with test_num=0"""
        # Mock LLM response
        mock_generate.return_value = [
            {
                "topic": "Newton's Laws",
                "subject": "Physics",
                "accuracy": 0.67,
                "checkpoint": "Repeatedly confused action-reaction pairs across multiple tests",
                "action": "Practice identifying force pairs on separate objects in real scenarios"
            }
        ]
        
        # Run the task synchronously
        populate_checkpoints_cumulative(self.student_id, self.class_id)
        
        # Verify data was stored with test_num=0
        checkpoint_record = Checkpoints.objects.get(
            student_id=self.student_id,
            class_id=self.class_id,
            test_num=0  # Cumulative indicator
        )
        
        self.assertIsNotNone(checkpoint_record)
        self.assertEqual(len(checkpoint_record.insights), 1)
        self.assertEqual(checkpoint_record.insights[0]['topic'], "Newton's Laws")
        self.assertIn('checkpoint', checkpoint_record.insights[0])
        self.assertIn('action', checkpoint_record.insights[0])
    
    def test_empty_data_handling(self):
        """Test handling when student has no wrong answers"""
        empty_student = "PERFECT_STUDENT"
        data = get_cumulative_checkpoints_data(empty_student, self.class_id)
        
        self.assertEqual(data['topics'], [])
