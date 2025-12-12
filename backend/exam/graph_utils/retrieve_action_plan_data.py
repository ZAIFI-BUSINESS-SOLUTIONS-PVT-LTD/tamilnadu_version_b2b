"""
Retrieve data for Action Plan metric from PostgreSQL tables.
Uses QuestionAnalysis and StudentResponse tables.
"""

from exam.models.analysis import QuestionAnalysis
from exam.models.response import StudentResponse
from exam.models.test import Test
from collections import defaultdict
import math
import logging

logger = logging.getLogger(__name__)


def calculate_weighted_accuracy(correct, total):
    """Calculate weighted accuracy: accuracy * log10(total + 1)"""
    if total == 0:
        return 0.0
    accuracy = correct / total
    return round(accuracy * math.log10(total + 1), 4)


def calculate_improvement_rate(score_list):
    """
    Calculate average improvement rate across tests.
    score_list: list of scores in chronological order
    """
    if len(score_list) < 2:
        return 0.0
    
    deltas = []
    for i in range(1, len(score_list)):
        prev = score_list[i - 1]
        curr = score_list[i]
        if prev == 0:
            continue
        delta = ((curr - prev) / abs(prev)) * 100
        deltas.append(delta)
    
    return round(sum(deltas) / len(deltas), 2) if deltas else 0.0


def get_action_plan_data(student_id, class_id, test_num):
    """
    Retrieve weak topics with wrong question data for action plan generation.
    
    Returns:
        dict: Structure for LLM consumption with weak topics and their wrong questions
    """
    try:
        # Get all tests for this class (chronological order)
        all_tests = Test.objects.filter(class_id=class_id).order_by('test_num').values_list('test_num', flat=True)
        all_tests = list(all_tests)
        
        if test_num not in all_tests:
            logger.warning(f"Test {test_num} not found for class {class_id}")
            return {}
        
        # Get current test questions with analysis
        current_questions = QuestionAnalysis.objects.filter(
            class_id=class_id,
            test_num=test_num
        ).values(
            'question_number', 'subject', 'chapter', 'topic', 'subtopic',
            'typeOfquestion', 'question_text', 'correct_answer',
            'option_1', 'option_2', 'option_3', 'option_4', 'im_desp',
            'option_1_feedback', 'option_2_feedback', 'option_3_feedback', 'option_4_feedback',
            'option_1_type', 'option_2_type', 'option_3_type', 'option_4_type',
            'option_1_misconception', 'option_2_misconception', 'option_3_misconception', 'option_4_misconception'
        )
        
        # Get student responses for current test
        current_responses = StudentResponse.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).values('question_number', 'selected_answer')
        
        # Build response map
        response_map = {r['question_number']: r['selected_answer'] for r in current_responses}
        
        # Calculate per-topic metrics for current test
        topic_data = defaultdict(lambda: {
            'total': 0,
            'correct': 0,
            'subject': '',
            'wrong_questions': []
        })
        
        for q in current_questions:
            qnum = q['question_number']
            topic = q['topic']
            subject = q['subject']
            
            # Skip if not answered
            if qnum not in response_map or not response_map[qnum]:
                continue
            
            selected = str(response_map[qnum]).strip().upper()
            correct_ans = str(q['correct_answer']).strip().upper()
            
            # Normalize answers (handle A/B/C/D or 1/2/3/4 or full text)
            is_correct = _compare_answers(selected, correct_ans, q)
            
            topic_data[topic]['total'] += 1
            topic_data[topic]['subject'] = subject
            
            if is_correct:
                topic_data[topic]['correct'] += 1
            else:
                # Store wrong question metadata
                wrong_q = _extract_wrong_question_data(q, selected)
                topic_data[topic]['wrong_questions'].append(wrong_q)
        
        # Calculate weighted accuracy and improvement rate per topic
        topic_metrics = []
        
        for topic, data in topic_data.items():
            if data['total'] == 0:
                continue
            
            accuracy = data['correct'] / data['total']
            weighted_acc = calculate_weighted_accuracy(data['correct'], data['total'])
            
            # Calculate improvement rate using historical data
            improvement_rate = _calculate_topic_improvement_rate(
                student_id, class_id, topic, all_tests, test_num
            )
            
            topic_metrics.append({
                'topic': topic,
                'subject': data['subject'],
                'accuracy': round(accuracy, 4),
                'weighted_accuracy': weighted_acc,
                'improvement_rate': improvement_rate,
                'total_questions': data['total'],
                'wrong_questions': data['wrong_questions']
            })
        
        # Filter weak topics and apply round-robin selection
        weak_topics = _select_weak_topics(topic_metrics, threshold=0.7)
        
        return weak_topics
        
    except Exception as e:
        logger.error(f"Error retrieving action plan data: {e}", exc_info=True)
        return {}


def _compare_answers(selected, correct, question_data):
    """Compare selected answer with correct answer, handling various formats"""
    # Direct match
    if selected == correct:
        return True
    
    # Map letter/number to option text
    option_map = {
        'A': '1', 'B': '2', 'C': '3', 'D': '4',
        '1': question_data.get('option_1', ''),
        '2': question_data.get('option_2', ''),
        '3': question_data.get('option_3', ''),
        '4': question_data.get('option_4', '')
    }
    
    # Try mapping selected
    if selected in option_map:
        selected_text = str(option_map[selected]).strip().upper()
        if selected_text == correct:
            return True
    
    # Try mapping correct
    if correct in option_map:
        correct_text = str(option_map[correct]).strip().upper()
        if selected == correct_text:
            return True
    
    # Try both mappings
    if selected in option_map and correct in option_map:
        selected_text = str(option_map[selected]).strip().upper()
        correct_text = str(option_map[correct]).strip().upper()
        if selected_text == correct_text:
            return True
    
    return False


def _extract_wrong_question_data(question, selected_answer):
    """Extract relevant data for a wrong question"""
    # Determine which option was selected
    option_map = {
        'A': '1', 'B': '2', 'C': '3', 'D': '4',
        '1': '1', '2': '2', '3': '3', '4': '4'
    }
    
    selected_key = selected_answer.strip().upper()
    if selected_key in option_map:
        option_num = option_map[selected_key]
    else:
        # Try to find which option matches the text
        option_num = '1'  # default
        for i in range(1, 5):
            opt_text = str(question.get(f'option_{i}', '')).strip().upper()
            if opt_text == selected_key:
                option_num = str(i)
                break
    
    return {
        'question_number': question['question_number'],
        'question_text': question['question_text'],
        'question_type': question['typeOfquestion'],
        'options': {
            '1': question.get('option_1', ''),
            '2': question.get('option_2', ''),
            '3': question.get('option_3', ''),
            '4': question.get('option_4', '')
        },
        'selected_answer': selected_answer,
        'correct_answer': question['correct_answer'],
        'feedback': question.get(f'option_{option_num}_feedback', ''),
        'misconception_type': question.get(f'option_{option_num}_type', ''),
        'misconception': question.get(f'option_{option_num}_misconception', ''),
        'im_desp': question.get('im_desp', '')
    }


def _calculate_topic_improvement_rate(student_id, class_id, topic, all_tests, current_test_num):
    """Calculate improvement rate for a topic across previous tests"""
    try:
        # Get topic scores for previous tests
        scores = []
        
        for tnum in all_tests:
            if tnum > current_test_num:
                break
            
            # Get questions for this topic in this test
            questions = QuestionAnalysis.objects.filter(
                class_id=class_id,
                test_num=tnum,
                topic=topic
            ).values('question_number', 'correct_answer')
            
            if not questions:
                continue
            
            # Get responses
            responses = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=tnum,
                question_number__in=[q['question_number'] for q in questions]
            ).values('question_number', 'selected_answer')
            
            response_map = {r['question_number']: r['selected_answer'] for r in responses}
            
            # Calculate correct count
            correct = 0
            total = 0
            for q in questions:
                qnum = q['question_number']
                if qnum in response_map and response_map[qnum]:
                    total += 1
                    selected = str(response_map[qnum]).strip().upper()
                    correct_ans = str(q['correct_answer']).strip().upper()
                    if selected == correct_ans or selected in correct_ans or correct_ans in selected:
                        correct += 1
            
            if total > 0:
                scores.append(correct)
        
        return calculate_improvement_rate(scores)
        
    except Exception as e:
        logger.warning(f"Error calculating improvement rate for topic {topic}: {e}")
        return 0.0


def _select_weak_topics(topic_metrics, threshold=0.7, max_topics=6):
    """
    Select weak topics using round-robin strategy per subject.
    
    Logic:
    1. Filter topics with weighted_accuracy < threshold
    2. If no topics, increase threshold to 0.85
    3. If still no topics, return empty (no weaknesses)
    4. Group by subject, sort by weighted_accuracy (asc), then improvement_rate (asc)
    5. Round-robin: take up to 2 from each subject until max_topics reached
    """
    # Filter by threshold
    weak = [t for t in topic_metrics if t['weighted_accuracy'] < threshold]
    
    if not weak:
        # Try higher threshold
        weak = [t for t in topic_metrics if t['weighted_accuracy'] < 0.85]
    
    if not weak:
        logger.info("No weak topics found - student performing well across all topics")
        return {}
    
    # Group by subject
    by_subject = defaultdict(list)
    for t in weak:
        by_subject[t['subject']].append(t)
    
    # Sort each subject's topics
    for subject in by_subject:
        by_subject[subject].sort(
            key=lambda x: (x['weighted_accuracy'], x['improvement_rate'])
        )
    
    # Round-robin selection
    selected = []
    subjects = list(by_subject.keys())
    
    for round_num in range(2):  # Up to 2 per subject
        for subject in subjects:
            if len(selected) >= max_topics:
                break
            if round_num < len(by_subject[subject]):
                selected.append(by_subject[subject][round_num])
        if len(selected) >= max_topics:
            break
    
    # Structure for LLM prompt
    result = {
        'topics': selected[:max_topics]
    }
    
    return result
