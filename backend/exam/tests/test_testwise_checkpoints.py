"""
Unit tests for test-wise checkpoints functionality.
Tests that `populate_checkpoints_testwise` stores LLM-generated checkpoints
in the `Checkpoints` model when weak topics exist, and stores empty insights
when there are no weak topics.
"""
import json
from django.test import TestCase
from unittest.mock import patch

from exam.models.checkpoints import Checkpoints
from exam.services.checkpoint_task import populate_checkpoints_testwise


class TestwiseCheckpointsTestCase(TestCase):
    """Test test-wise checkpoint generation and storage"""

    def setUp(self):
        self.student_id = "2025300001"
        self.class_id = "ba_rgr_04"
        self.test_num = 12

    @patch('exam.services.checkpoint_task.generate_checkpoints_testwise')
    @patch('exam.services.checkpoint_task.get_action_plan_data')
    def test_populate_checkpoints_testwise_task(self, mock_get_action, mock_generate):
        """When weak topics exist, the task should store generated checkpoints"""
        # Mock weak topics data returned by get_action_plan_data
        mock_get_action.return_value = {
            'topics': [
                {
                    'topic_metadata': {'subject': 'Physics', 'topic': "Newton's Laws", 'accuracy': 0.5},
                    'wrong_questions_by_test': []
                }
            ]
        }

        # Mock LLM response
        mock_generate.return_value = [
            {
                'topic': "Newton's Laws",
                'subject': 'Physics',
                'accuracy': 0.5,
                'checkpoint': 'Confuses action-reaction across problems',
                'action': 'Practice identifying interacting pairs'
            }
        ]

        # Run the task synchronously (call directly)
        populate_checkpoints_testwise(self.student_id, self.class_id, self.test_num)

        # Verify Checkpoints record exists for this test_num
        cp = Checkpoints.objects.filter(
            student_id=self.student_id,
            class_id=self.class_id,
            test_num=self.test_num
        ).first()

        self.assertIsNotNone(cp, "Checkpoints record should be created")
        self.assertIsInstance(cp.insights, list)
        self.assertEqual(len(cp.insights), 1)
        self.assertEqual(cp.insights[0]['topic'], "Newton's Laws")
        self.assertIn('checkpoint', cp.insights[0])
        self.assertIn('action', cp.insights[0])

    @patch('exam.graph_utils.retrieve_action_plan_data.get_action_plan_data')
    def test_empty_weak_topics_store_empty_insights(self, mock_get_action):
        """When there are no weak topics, the task should store empty insights"""
        mock_get_action.return_value = {'topics': []}

        populate_checkpoints_testwise(self.student_id, self.class_id, self.test_num)

        cp = Checkpoints.objects.filter(
            student_id=self.student_id,
            class_id=self.class_id,
            test_num=self.test_num
        ).first()

        self.assertIsNotNone(cp, "Checkpoints record should be created even if empty")
        self.assertEqual(cp.insights, [])
