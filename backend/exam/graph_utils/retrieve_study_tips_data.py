"""
Retrieve Study Tips Data Module

This module fetches categorized topic performance data and question type analysis
for generating personalized study tips based on student's strengths, weaknesses,
and mistake patterns.
"""

import logging
from django.db.models import Q, Count, Case, When, IntegerField
from exam.models.analysis import QuestionAnalysis
from exam.models.response import StudentResponse
import math

logger = logging.getLogger(__name__)


def calculate_weighted_accuracy(correct, total):
    """
    Calculate weighted accuracy using logarithmic scaling.
    
    Args:
        correct: Number of correct answers
        total: Total number of questions
    
    Returns:
        float: Weighted accuracy score
    """
    if total == 0:
        return 0.0
    
    accuracy = correct / total
    # Apply logarithmic weight to give more importance to topics with more questions
    weight = math.log10(total + 1)
    weighted_accuracy = accuracy * weight
    
    return weighted_accuracy


def get_study_tips_data(student_id, class_id, test_num):
    """
    Retrieve categorized topic performance and question type analysis for study tips.
    
    Categories topics as:
    - Strong: weighted_accuracy >= 0.85 (85%)
    - Weak: weighted_accuracy < 0.60 (60%)
    - Moderate: 0.60 <= weighted_accuracy < 0.85
    
    Also analyzes performance by question type.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    
    Returns:
        dict: Contains categorized topics and question type analysis
    """
    try:
        logger.info(f"Fetching study tips data for student {student_id}, class {class_id}, test {test_num}")
        
        # Fetch student responses for the test
        responses = StudentResponse.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        )

        if not responses.exists():
            logger.warning(f"No responses found for student {student_id}, test {test_num}")
            return {
                'strong_topics': [],
                'weak_topics': [],
                'moderate_topics': [],
                'question_type_analysis': []
            }

        # Build a map of question_number -> selected_answer for quick lookup
        response_map = {r.question_number: (r.selected_answer or '').strip() for r in responses}

        # Fetch the question metadata for only those questions student answered
        question_numbers = list(response_map.keys())
        analyses = QuestionAnalysis.objects.filter(
            class_id=class_id,
            test_num=test_num,
            question_number__in=question_numbers
        )

        if not analyses.exists():
            logger.warning(f"No question analysis records found for class {class_id}, test {test_num}")
            return {
                'strong_topics': [],
                'weak_topics': [],
                'moderate_topics': [],
                'question_type_analysis': []
            }

        # Aggregate topic-level data
        topic_stats = {}
        question_type_stats = {}

        for analysis in analyses:
            subject = analysis.subject or 'Unknown'
            topic = analysis.topic or 'Unknown'
            # model field is 'typeOfquestion'
            question_type = getattr(analysis, 'typeOfquestion', None) or 'Unknown'
            qnum = analysis.question_number
            selected = response_map.get(qnum, '')
            correct_answer = (analysis.correct_answer or '').strip()
            is_correct = (selected != '' and selected == correct_answer)
            
            # Build topic key
            topic_key = (subject, topic)
            
            if topic_key not in topic_stats:
                topic_stats[topic_key] = {
                    'subject': subject,
                    'topic': topic,
                    'correct': 0,
                    'total': 0
                }
            
            topic_stats[topic_key]['total'] += 1
            if is_correct:
                topic_stats[topic_key]['correct'] += 1
            
            # Build question type stats
            if question_type not in question_type_stats:
                question_type_stats[question_type] = {
                    'question_type': question_type,
                    'correct': 0,
                    'incorrect': 0
                }

            if is_correct:
                question_type_stats[question_type]['correct'] += 1
            else:
                question_type_stats[question_type]['incorrect'] += 1
        
        # Calculate weighted accuracy and categorize topics
        strong_topics = []
        weak_topics = []
        moderate_topics = []
        
        for (subject, topic), stats in topic_stats.items():
            correct = stats['correct']
            total = stats['total']
            
            # Calculate accuracy
            accuracy = correct / total if total > 0 else 0.0
            weighted_accuracy = calculate_weighted_accuracy(correct, total)
            
            topic_data = {
                'subject': subject,
                'topic': topic,
                'accuracy': round(accuracy, 3),
                'weighted_accuracy': round(weighted_accuracy, 3),
                'correct': correct,
                'total': total
            }
            
            # Categorize based on accuracy
            if accuracy >= 0.85:
                strong_topics.append(topic_data)
            elif accuracy < 0.60:
                weak_topics.append(topic_data)
            else:
                moderate_topics.append(topic_data)
        
        # Sort each category by weighted_accuracy (descending)
        strong_topics.sort(key=lambda x: x['weighted_accuracy'], reverse=True)
        weak_topics.sort(key=lambda x: x['weighted_accuracy'])  # Ascending for weak (weakest first)
        moderate_topics.sort(key=lambda x: x['weighted_accuracy'], reverse=True)
        
        # Convert question type stats to list
        question_type_analysis = list(question_type_stats.values())
        question_type_analysis.sort(key=lambda x: x['correct'] + x['incorrect'], reverse=True)
        
        result = {
            'strong_topics': strong_topics,
            'weak_topics': weak_topics,
            'moderate_topics': moderate_topics,
            'question_type_analysis': question_type_analysis
        }
        
        logger.info(f"✅ Study tips data retrieved: {len(strong_topics)} strong, "
                   f"{len(weak_topics)} weak, {len(moderate_topics)} moderate topics")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Error retrieving study tips data: {e}", exc_info=True)
        return {
            'strong_topics': [],
            'weak_topics': [],
            'moderate_topics': [],
            'question_type_analysis': []
        }
