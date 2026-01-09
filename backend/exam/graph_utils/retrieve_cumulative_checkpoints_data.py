"""
Retrieve cumulative (all-tests) data for generating overall checkpoint insights.
Groups wrong questions by topic and test for pattern analysis.
"""

from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis
from collections import defaultdict
import json
import logging
import math

logger = logging.getLogger(__name__)


def calculate_weighted_accuracy(correct, total):
    """Calculate weighted accuracy: accuracy * log10(total + 1)"""
    if total == 0:
        return 0.0
    accuracy = correct / total
    return round(accuracy * math.log10(total + 1), 4)


def calculate_improvement_rate(test_accuracies):
    """
    Calculate improvement rate from a list of (test_num, accuracy) tuples.
    Returns percentage change from first to last test.
    """
    if len(test_accuracies) < 2:
        return "+0%"
    
    # Sort by test_num
    sorted_tests = sorted(test_accuracies, key=lambda x: x[0])
    first_acc = sorted_tests[0][1]
    last_acc = sorted_tests[-1][1]
    
    if first_acc == 0:
        return "+0%"
    
    change = ((last_acc - first_acc) / first_acc) * 100
    sign = "+" if change >= 0 else ""
    return f"{sign}{round(change)}%"


def parse_misconception_field(misconception_text):
    """
    Parse the misconception field (can be JSON or plain text).
    Returns (misconception_type, misconception_text).
    """
    if not misconception_text:
        return "unknown", "No misconception recorded"
    
    # Try parsing as JSON
    try:
        data = json.loads(misconception_text)
        if isinstance(data, dict):
            return (
                data.get('misconception_type', 'unknown'),
                data.get('misconception_text', misconception_text)
            )
    except (json.JSONDecodeError, TypeError):
        pass
    
    # Fallback: treat as plain text
    # Try to extract type from text patterns like "Conceptual: ..."
    text_str = str(misconception_text).strip()
    if ':' in text_str:
        parts = text_str.split(':', 1)
        return parts[0].strip().lower(), parts[1].strip()
    
    return "conceptual", text_str


def get_cumulative_checkpoints_data(student_id, class_id):
    """
    Retrieve all-tests data for cumulative checkpoint generation.
    
    Returns dict with structure:
    {
        "topics": [
            {
                "topic_metadata": {
                    "subject": "...",
                    "chapter": "...",
                    "topic": "...",
                    "total_questions_attempted": 72,
                    "accuracy": 64,
                    "weighted_accuracy": 60,
                    "improvement_rate": "+12%"
                },
                "wrong_questions_by_test": [
                    {
                        "test_id": "Test_1",
                        "wrong_questions": [
                            {
                                "question_number": 5,
                                "misconception_type": "conceptual",
                                "misconception_text": "..."
                            }
                        ]
                    }
                ]
            }
        ]
    }
    """
    try:
        logger.info(f"📊 Retrieving cumulative checkpoint data for student={student_id}, class={class_id}")
        
        # Get all wrong answers across all tests for this student
        wrong_results = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            is_correct=False,
            was_attempted=True
        ).values(
            'test_num', 'question_number', 'subject', 'chapter', 'topic', 'misconception'
        ).order_by('test_num', 'question_number')
        
        if not wrong_results:
            logger.info(f"No wrong answers found for student {student_id} - performing perfectly!")
            return {"topics": []}
        
        # Group by topic
        topic_groups = defaultdict(lambda: {
            'subject': '',
            'chapter': '',
            'topic': '',
            'total_attempted': 0,
            'total_correct': 0,
            'test_accuracies': [],  # [(test_num, accuracy)]
            'wrong_by_test': defaultdict(list)
        })
        
        # First pass: collect wrong questions
        for result in wrong_results:
            topic = result['topic']
            test_num = result['test_num']
            
            topic_groups[topic]['subject'] = result['subject']
            topic_groups[topic]['chapter'] = result['chapter']
            topic_groups[topic]['topic'] = topic
            
            # Parse misconception
            misc_type, misc_text = parse_misconception_field(result['misconception'])
            
            topic_groups[topic]['wrong_by_test'][test_num].append({
                'question_number': result['question_number'],
                'misconception_type': misc_type,
                'misconception_text': misc_text
            })
        
        # Second pass: calculate total attempted and correct per topic across all tests
        for topic in topic_groups.keys():
            # Get all StudentResult records for this topic (correct + wrong)
            all_topic_results = StudentResult.objects.filter(
                student_id=student_id,
                class_id=class_id,
                topic=topic,
                was_attempted=True
            ).values('test_num', 'is_correct')
            
            # Group by test for improvement rate calculation
            test_stats = defaultdict(lambda: {'total': 0, 'correct': 0})
            for res in all_topic_results:
                test_stats[res['test_num']]['total'] += 1
                if res['is_correct']:
                    test_stats[res['test_num']]['correct'] += 1
            
            # Calculate total and accuracy per test
            topic_groups[topic]['total_attempted'] = sum(s['total'] for s in test_stats.values())
            topic_groups[topic]['total_correct'] = sum(s['correct'] for s in test_stats.values())
            
            # Build test accuracies for improvement rate
            for test_num, stats in test_stats.items():
                if stats['total'] > 0:
                    acc = stats['correct'] / stats['total']
                    topic_groups[topic]['test_accuracies'].append((test_num, acc))
        
        # Build final structure
        topics_output = []
        for topic, data in topic_groups.items():
            total = data['total_attempted']
            correct = data['total_correct']
            
            if total == 0:
                continue
            
            accuracy = round((correct / total) * 100)  # percentage
            weighted_acc = round(calculate_weighted_accuracy(correct, total) * 100)  # percentage
            improvement_rate = calculate_improvement_rate(data['test_accuracies'])
            
            # Format wrong_questions_by_test
            wrong_by_test = []
            for test_num in sorted(data['wrong_by_test'].keys()):
                wrong_by_test.append({
                    'test_id': f"Test_{test_num}",
                    'wrong_questions': data['wrong_by_test'][test_num]
                })
            
            topics_output.append({
                'topic_metadata': {
                    'subject': data['subject'],
                    'chapter': data['chapter'],
                    'topic': data['topic'],
                    'total_questions_attempted': total,
                    'accuracy': accuracy,
                    'weighted_accuracy': weighted_acc,
                    'improvement_rate': improvement_rate
                },
                'wrong_questions_by_test': wrong_by_test
            })
        
        logger.info(f"✅ Retrieved {len(topics_output)} topics with cumulative data for student {student_id}")
        return {"topics": topics_output}
        
    except Exception as e:
        logger.error(f"❌ Error retrieving cumulative checkpoint data: {e}", exc_info=True)
        return {"topics": []}
