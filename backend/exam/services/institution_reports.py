"""
Institution Report Services
Helper functions for generating detailed test performance reports for institution dashboard.
"""

import logging
import re
from exam.models import QuestionAnalysis, Student, StudentResponse, Educator, Manager

logger = logging.getLogger(__name__)


def clean_latex_text(text):
    """
    Clean LaTeX formatting from text while preserving mathematical meaning.
    
    Args:
        text (str): Text with LaTeX formatting
        
    Returns:
        str: Cleaned text
    """
    if not text:
        return text
    
    cleaned = str(text)
    
    # Remove excessive whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Clean up common LaTeX artifacts but keep essential math
    cleaned = cleaned.replace('\\mathrm', '')
    cleaned = cleaned.replace('\\text', '')
    cleaned = cleaned.replace('{', '')
    cleaned = cleaned.replace('}', '')
    cleaned = cleaned.replace('~', ' ')
    
    # Clean up multiple spaces
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = cleaned.strip()
    
    return cleaned


def get_test_student_performance(class_id, test_num):
    """
    Generate comprehensive test performance data for all students who attended the test.
    
    Args:
        class_id (str): The class identifier
        test_num (int): The test number
        
    Returns:
        dict: Structured data with questions and per-student responses
        {
            "class_id": str,
            "test_num": int,
            "questions": [
                {
                    "question_number": int,
                    "question_text": str,
                    "options": [str, str, str, str],
                    "correct_answer": str
                },
                ...
            ],
            "students": [
                {
                    "student_id": str,
                    "student_name": str,
                    "responses": [
                        {
                            "question_number": int,
                            "selected_answer": str or None,
                            "is_correct": bool
                        },
                        ...
                    ]
                },
                ...
            ]
        }
    """
    
    # Step 1: Fetch all questions for this test
    questions_qs = QuestionAnalysis.objects.filter(
        class_id=class_id,
        test_num=test_num
    ).order_by('question_number').values(
        'question_number',
        'subject',
        'question_text',
        'option_1',
        'option_2',
        'option_3',
        'option_4',
        'correct_answer'
    )
    
    questions_list = list(questions_qs)
    
    if not questions_list:
        logger.warning(f"No questions found for class_id={class_id}, test_num={test_num}")
        return {
            "class_id": class_id,
            "test_num": test_num,
            "questions": [],
            "students": []
        }
    
    # Build question lookup dict and map correct_answer to option number
    question_map = {}
    for q in questions_list:
        # Determine which option number matches the correct_answer
        correct_option_num = _get_correct_option_number(
            q['correct_answer'],
            q['option_1'],
            q['option_2'],
            q['option_3'],
            q['option_4']
        )
        question_map[q['question_number']] = {
            **q,
            'correct_option_number': correct_option_num
        }
    
    # Step 2: Find all students who attended this test (have responses)
    student_ids = StudentResponse.objects.filter(
        class_id=class_id,
        test_num=test_num
    ).values_list('student_id', flat=True).distinct()
    
    student_ids_list = list(student_ids)
    
    if not student_ids_list:
        logger.info(f"No students attended test class_id={class_id}, test_num={test_num}")
        # Return questions but empty students list
        questions_formatted = [
            {
                "question_number": q['question_number'],
                "subject": q.get('subject'),
                "question_text": q['question_text'],
                "options": [
                    q['option_1'],
                    q['option_2'],
                    q['option_3'],
                    q['option_4']
                ],
                "correct_answer": q['correct_answer']
            }
            for q in questions_list
        ]
        
        return {
            "class_id": class_id,
            "test_num": test_num,
            "questions": questions_formatted,
            "students": []
        }
    
    # Step 3: Fetch student details
    students_qs = Student.objects.filter(
        class_id=class_id,
        student_id__in=student_ids_list
    ).values('student_id', 'name')
    
    students_map = {s['student_id']: s['name'] for s in students_qs}
    
    # Step 4: Fetch all responses for these students in one query
    responses_qs = StudentResponse.objects.filter(
        class_id=class_id,
        test_num=test_num,
        student_id__in=student_ids_list
    ).values('student_id', 'question_number', 'selected_answer')
    
    # Group responses by student_id
    responses_by_student = {}
    for resp in responses_qs:
        sid = resp['student_id']
        if sid not in responses_by_student:
            responses_by_student[sid] = {}
        responses_by_student[sid][resp['question_number']] = resp['selected_answer']
    
    # Step 5: Build formatted response
    questions_formatted = [
        {
            "question_number": q['question_number'],
            "subject": q.get('subject'),
            "question_text": q['question_text'],  # Keep original with LaTeX for frontend to handle
            "options": [
                q['option_1'],
                q['option_2'],
                q['option_3'],
                q['option_4']
            ],
            "correct_answer": q['correct_answer'],
            "correct_option_number": question_map[q['question_number']]['correct_option_number']
        }
        for q in questions_list
    ]
    
    students_formatted = []
    for student_id in sorted(student_ids_list):
        student_name = students_map.get(student_id, "Unknown")
        student_responses_map = responses_by_student.get(student_id, {})
        
        # Build response list for all questions
        responses = []
        for q_num in sorted(question_map.keys()):
            selected = student_responses_map.get(q_num)
            correct_option_number = question_map[q_num]['correct_option_number']
            
            # Compare selected option number with correct option number
            is_correct = _is_answer_correct(selected, correct_option_number)
            
            responses.append({
                "question_number": q_num,
                "selected_answer": selected,
                "is_correct": is_correct
            })
        
        students_formatted.append({
            "student_id": student_id,
            "student_name": student_name,
            "responses": responses
        })
    
    return {
        "class_id": class_id,
        "test_num": test_num,
        "questions": questions_formatted,
        "students": students_formatted
    }


def _get_correct_option_number(correct_answer, option_1, option_2, option_3, option_4):
    """
    Map the correct_answer text to its option number (1, 2, 3, or 4).
    
    Args:
        correct_answer: The correct answer text
        option_1, option_2, option_3, option_4: The option texts
        
    Returns:
        str: The option number as string ("1", "2", "3", or "4"), or None if no match
    """
    if not correct_answer:
        return None
    
    # Normalize for comparison
    correct_normalized = str(correct_answer).strip().upper()
    
    # Check each option
    options = {
        '1': option_1,
        '2': option_2,
        '3': option_3,
        '4': option_4
    }
    
    for opt_num, opt_text in options.items():
        if opt_text:
            opt_normalized = str(opt_text).strip().upper()
            if correct_normalized == opt_normalized:
                return opt_num
    
    # If no exact match, return None
    logger.warning(f"Could not map correct_answer '{correct_answer}' to any option")
    return None


def _is_answer_correct(selected_answer, correct_answer):
    """
    Compare selected answer with correct answer.
    Handles None, empty strings, and normalizes whitespace/case.
    
    Args:
        selected_answer: The answer selected by student (can be None or str)
        correct_answer: The correct answer (str)
        
    Returns:
        bool: True if correct, False otherwise
    """
    if selected_answer is None or selected_answer == '':
        return False
    
    if correct_answer is None or correct_answer == '':
        return False
    
    # Normalize both to strings, strip whitespace, and compare case-insensitively
    selected_normalized = str(selected_answer).strip().upper()
    correct_normalized = str(correct_answer).strip().upper()
    
    return selected_normalized == correct_normalized
