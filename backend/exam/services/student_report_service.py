"""
Student Report Data Service
Computes aggregated metrics for student reports table.
Reuses logic from overview and metrics modules.
"""

from exam.models.result import StudentResult, Result
from exam.models.student import Student
from exam.graph_utils.calculate_metrics import calculate_improvement_rate_pg
from exam.graph_utils.retrieve_cumulative_checkpoints_data import get_cumulative_checkpoints_data
from exam.llm_call.subtopic_recommender import generate_subtopic_recommendations
from django.db.models import Count, Sum, Case, When, IntegerField, Avg, Q
import logging

logger = logging.getLogger(__name__)


def compute_student_report_data(student_id, class_id, test_num):
    """
    Compute all metrics required for the StudentReport table.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        test_num (int): Test number
    
    Returns:
        dict: {
            'mark': float,
            'average': float,
            'improvement_rate': float,
            'subject_wise': dict,
            'subject_wise_avg': dict,
            'subtopic_list': dict,
            'sub_wise_marks': dict,
            'class_vs_student': list
        }
    """
    # 1. Calculate student's mark/score for this test
    mark = _calculate_test_mark(student_id, class_id, test_num)
    
    # 2. Calculate student's average score across tests 1 through test_num (cumulative)
    average = _calculate_student_average(student_id, class_id, test_num)
    
    # 3. Calculate improvement rate for THIS test (relative to previous test)
    improvement_rate = _calculate_improvement_for_test(student_id, class_id, test_num)
    
    # 4. Get subject-wise correct/incorrect/skipped counts for this test
    subject_wise = _get_subject_wise_counts(student_id, class_id, test_num)
    
    # 5. Calculate this student's subject-wise cumulative averages (tests 1 through test_num)
    subject_wise_avg = _calculate_subject_wise_student_averages(student_id, class_id, test_num)
    
    # 6. Generate subtopic recommendations (LLM-based, triggered after all other calculations)
    subtopic_list = _generate_subtopic_recommendations(student_id, class_id, test_num)
    
    # 7. Calculate cumulative subject-wise marks (NEW)
    sub_wise_marks = _calculate_subject_wise_marks(student_id, class_id, test_num)
    
    # 8. Get class vs student analysis - questions where class did well but student failed (NEW)
    class_vs_student = _get_class_vs_student_analysis(student_id, class_id, test_num)
    
    return {
        'mark': mark,
        'average': average,
        'improvement_rate': improvement_rate,
        'subject_wise': subject_wise,
        'subject_wise_avg': subject_wise_avg,
        'subtopic_list': subtopic_list,
        'sub_wise_marks': sub_wise_marks,
        'class_vs_student': class_vs_student
    }


def _calculate_test_mark(student_id, class_id, test_num):
    """
    Calculate student's total mark for a specific test.
    Scoring: +4 for correct, -1 for incorrect, 0 for skipped.
    
    Returns:
        float: Total marks for the test
    """
    result = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num
    ).aggregate(
        total_score=Sum(
            Case(
                When(is_correct=True, then=4),
                When(Q(is_correct=False) & Q(was_attempted=True), then=-1),
                When(Q(is_correct=False) & Q(was_attempted=False), then=0),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    return float(result['total_score'] or 0)


def _calculate_student_average(student_id, class_id, up_to_test_num):
    """
    Calculate student's average score across tests 1 through up_to_test_num (cumulative).
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        up_to_test_num (int): Include tests from 1 up to and including this test number
    
    Returns:
        float: Average score across tests 1 to up_to_test_num
    """
    # Get score for each test up to and including the current test
    test_scores = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num__lte=up_to_test_num
    ).values('test_num').annotate(
        test_score=Sum(
            Case(
                When(is_correct=True, then=4),
                When(Q(is_correct=False) & Q(was_attempted=True), then=-1),
                When(Q(is_correct=False) & Q(was_attempted=False), then=0),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    if not test_scores:
        return 0.0
    
    # Calculate average
    total = sum(test['test_score'] for test in test_scores)
    count = len(test_scores)
    
    return round(total / count, 2) if count > 0 else 0.0


def _get_subject_wise_counts(student_id, class_id, test_num):
    """
    Get correct, incorrect, and skipped counts per subject for this test.
    
    Returns:
        dict: {subject_name: {'correct': n, 'incorrect': n, 'skipped': n}}
    """
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num
    ).values('subject').annotate(
        correct=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        ),
        incorrect=Sum(
            Case(
                When(Q(is_correct=False) & Q(was_attempted=True), then=1),
                default=0,
                output_field=IntegerField()
            )
        ),
        skipped=Sum(
            Case(
                When(Q(is_correct=False) & Q(was_attempted=False), then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    subject_wise = {}
    for r in results:
        subject_wise[r['subject']] = {
            'correct': r['correct'],
            'incorrect': r['incorrect'],
            'skipped': r['skipped']
        }
    
    return subject_wise


def _calculate_subject_wise_student_averages(student_id, class_id, up_to_test_num):
    """
    Calculate cumulative average mark per subject for this specific student.
    For each subject: sum student's marks across tests 1 through up_to_test_num, divide by test count.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        up_to_test_num (int): Include tests from 1 up to and including this test number
    
    Returns:
        dict: {subject_name: student's_cumulative_average_mark_in_subject}
    """
    # Calculate student's cumulative total per subject across all tests up to test_num
    subject_data = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num__lte=up_to_test_num
    ).values('subject', 'test_num').annotate(
        test_subject_score=Sum(
            Case(
                When(is_correct=True, then=4),
                When(Q(is_correct=False) & Q(was_attempted=True), then=-1),
                When(Q(is_correct=False) & Q(was_attempted=False), then=0),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    # Group by subject and collect test scores
    from collections import defaultdict
    subject_test_scores = defaultdict(list)
    
    for record in subject_data:
        subject = record['subject']
        score = record['test_subject_score'] or 0
        subject_test_scores[subject].append(score)
    
    # Calculate average for each subject
    subject_wise_avg = {}
    for subject, scores in subject_test_scores.items():
        avg = sum(scores) / len(scores) if scores else 0.0
        subject_wise_avg[subject] = round(avg, 2)
    
    return subject_wise_avg


def _generate_subtopic_recommendations(student_id, class_id, test_num):
    """
    Generate subtopic recommendations using LLM based on student's mistake patterns.
    Uses cumulative data (all tests up to test_num) for comprehensive analysis.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        test_num (int): Test number (used for context, but data is cumulative)
    
    Returns:
        dict: {subject: [{subtopic, rank, reason, citations}]}
    """
    try:
        # Get cumulative checkpoint data (all tests)
        cumulative_data = get_cumulative_checkpoints_data(student_id, class_id)
        
        if not cumulative_data or 'topics' not in cumulative_data or not cumulative_data['topics']:
            logger.info(f"No cumulative topics data for student {student_id} - skipping subtopic generation")
            return {}
        
        # Generate subtopic recommendations using LLM with cumulative data
        subtopics = generate_subtopic_recommendations(student_id, class_id, test_num, cumulative_data)
        
        return subtopics
        
    except Exception as e:
        logger.error(f"Error generating subtopic recommendations for student {student_id}: {e}", exc_info=True)
        return {}


def _calculate_subject_wise_marks(student_id, class_id, up_to_test_num):
    """
    Calculate subject-wise marks per test from test 1 through up_to_test_num.
    Returns marks per subject for each test.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        up_to_test_num (int): Include tests from 1 up to and including this test number
    
    Returns:
        dict: {test_num: {subject_name: marks}}
        Example: {"1": {"Physics": 40, "Chemistry": 36}, "2": {"Physics": 38, "Chemistry": 40}}
    """
    # Get all results for this student up to test_num, grouped by test and subject
    subject_data = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num__lte=up_to_test_num
    ).values('test_num', 'subject').annotate(
        test_marks=Sum(
            Case(
                When(is_correct=True, then=4),
                When(Q(is_correct=False) & Q(was_attempted=True), then=-1),
                When(Q(is_correct=False) & Q(was_attempted=False), then=0),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('test_num', 'subject')
    
    # Build nested dict: test_num -> subject -> marks
    from collections import defaultdict
    sub_wise_marks = defaultdict(dict)
    
    for record in subject_data:
        test_num = str(record['test_num'])  # Convert to string for JSON compatibility
        subject = record['subject']
        marks = record['test_marks'] or 0
        sub_wise_marks[test_num][subject] = float(marks)
    
    return dict(sub_wise_marks)


def _get_class_vs_student_analysis(student_id, class_id, test_num):
    """
    Find questions where the class performed well but this student failed.
    Returns top 3-5 such questions with class performance and student's response.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        test_num (int): Test number
    
    Returns:
        list: [
            {
                'question_num': int,
                'correct_count': int,
                'correct_option': str,
                'student_option': str
            }
        ]
    """
    from exam.models.analysis import QuestionAnalysis
    from exam.models.response import StudentResponse
    
    # Get all questions for this test
    questions = QuestionAnalysis.objects.filter(
        class_id=class_id,
        test_num=test_num
    ).values('question_number', 'correct_answer', 'option_1', 'option_2', 'option_3', 'option_4')
    
    if not questions:
        return []
    
    # Get this student's results (correctness) from StudentResult
    student_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num
    ).values('question_number', 'is_correct')
    
    student_results_map = {r['question_number']: r['is_correct'] for r in student_results}
    
    # Get this student's selected answers from StudentResponse
    student_responses = StudentResponse.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num
    ).values('question_number', 'selected_answer')
    
    student_response_map = {r['question_number']: r['selected_answer'] for r in student_responses}
    student_response_map = {r['question_number']: r['selected_answer'] for r in student_responses}
    
    # For each question, get class performance (excluding this student)
    question_analysis = []
    
    for q in questions:
        q_num = q['question_number']
        correct_ans = q['correct_answer']
        
        # Skip if student didn't answer or got it correct
        if q_num not in student_results_map:
            continue
        if student_results_map[q_num]:
            continue
        
        # Get all students' responses for this question (excluding current student)
        class_responses = StudentResult.objects.filter(
            class_id=class_id,
            test_num=test_num,
            question_number=q_num
        ).exclude(student_id=student_id).aggregate(
            correct_count=Sum(
                Case(
                    When(is_correct=True, then=1),
                    default=0,
                    output_field=IntegerField()
                )
            ),
            total_attempted=Count(
                'student_id',
                filter=Q(was_attempted=True)
            )
        )
        
        correct_count = class_responses['correct_count'] or 0
        total_attempted = class_responses['total_attempted'] or 0
        
        # Only include questions where class did reasonably well
        # (at least 50% of attempted students got it correct)
        if total_attempted > 0 and correct_count / total_attempted >= 0.5:
            # Find which option number matches the correct answer text
            correct_option_num = _find_option_number(
                correct_ans,
                q['option_1'],
                q['option_2'],
                q['option_3'],
                q['option_4']
            )
            
            # Normalize student's answer to number format
            student_ans_normalized = _normalize_answer_to_number(student_response_map.get(q_num, ''))
            
            question_analysis.append({
                'question_num': q_num,
                'correct_count': correct_count,
                'total_attempted': total_attempted,
                'correct_option': correct_option_num,
                'student_option': student_ans_normalized
            })
    
    # Sort by correct_count descending and take top 3-5
    question_analysis.sort(key=lambda x: x['correct_count'], reverse=True)
    top_questions = question_analysis[:5]  # Take top 5
    
    # Format for output (remove total_attempted from final result)
    result = [
        {
            'question_num': q['question_num'],
            'correct_count': q['correct_count'],
            'correct_option': q['correct_option'],
            'student_option': q['student_option']
        }
        for q in top_questions
    ]
    
    return result


def _calculate_improvement_for_test(student_id, class_id, test_num):
    """
    Calculate improvement for a specific test relative to the most recent previous test.
    Returns percentage change rounded to 2 decimals. If no previous test or previous mark is 0, returns 0.0.
    """
    try:
        # Find the most recent previous test number for this student and class
        prev_test_qs = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num__lt=test_num
        ).values_list('test_num', flat=True).distinct().order_by('-test_num')

        prev_test_num = prev_test_qs.first() if prev_test_qs else None
        if not prev_test_num:
            return 0.0

        # Use existing helper to compute marks for current and previous tests
        curr_mark = _calculate_test_mark(student_id, class_id, test_num)
        prev_mark = _calculate_test_mark(student_id, class_id, prev_test_num)

        if prev_mark == 0:
            return 0.0

        change = ((curr_mark - prev_mark) / abs(prev_mark)) * 100.0
        return round(change, 2)
    except Exception:
        return 0.0


def _find_option_number(correct_answer, option_1, option_2, option_3, option_4):
    """
    Find which option number (1-4) matches the correct answer text.
    
    Args:
        correct_answer: The correct answer text
        option_1, option_2, option_3, option_4: The option texts
    
    Returns:
        str: Option number as "1", "2", "3", or "4"
    """
    if not correct_answer:
        return ""
    
    correct_answer_normalized = str(correct_answer).strip().upper()
    
    # Check direct number match first
    if correct_answer_normalized in ['1', '2', '3', '4']:
        return correct_answer_normalized
    
    # Check letter match
    letter_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4'}
    if correct_answer_normalized in letter_map:
        return letter_map[correct_answer_normalized]
    
    # Match against option texts
    options = {
        '1': str(option_1 or '').strip().upper(),
        '2': str(option_2 or '').strip().upper(),
        '3': str(option_3 or '').strip().upper(),
        '4': str(option_4 or '').strip().upper()
    }
    
    for option_num, option_text in options.items():
        if option_text and option_text == correct_answer_normalized:
            return option_num
    
    # Fallback: try to extract number from correct_answer
    import re
    number_match = re.search(r'[1-4]', correct_answer_normalized)
    if number_match:
        return number_match.group(0)
    
    # Last resort: return empty string
    return ""


def _normalize_answer_to_number(answer):
    """
    Normalize answer to a simple number format (1, 2, 3, 4).
    Handles various formats: "1", "A", "Option 1", "OSF2", etc.
    
    Args:
        answer: Answer in any format
    
    Returns:
        str: Normalized answer as "1", "2", "3", or "4", or original if can't normalize
    """
    if not answer:
        return ""
    
    answer_str = str(answer).strip().upper()
    
    # Direct number match
    if answer_str in ['1', '2', '3', '4']:
        return answer_str
    
    # Letter to number mapping
    letter_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4'}
    if answer_str in letter_map:
        return letter_map[answer_str]
    
    # Extract number from string (e.g., "Option 1" -> "1", "OSF2" -> "2")
    import re
    number_match = re.search(r'[1-4]', answer_str)
    if number_match:
        return number_match.group(0)
    
    # If no number found, return original
    return answer_str


def save_student_report(student_id, class_id, test_num, report_data):
    """
    Save or update student report record in the database.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        test_num (int): Test number
        report_data (dict): Computed report data from compute_student_report_data()
    
    Returns:
        StudentReport: Saved model instance
    """
    from exam.models.student_report import StudentReport
    
    report, created = StudentReport.objects.update_or_create(
        class_id=class_id,
        test_num=test_num,
        student_id=student_id,
        defaults={
            'mark': report_data['mark'],
            'average': report_data['average'],
            'improvement_rate': report_data['improvement_rate'],
            'subject_wise': report_data['subject_wise'],
            'subject_wise_avg': report_data['subject_wise_avg'],
            'subtopic_list': report_data.get('subtopic_list', {}),
            'sub_wise_marks': report_data.get('sub_wise_marks', {}),
            'class_vs_student': report_data.get('class_vs_student', [])
        }
    )
    
    action = "created" if created else "updated"
    logger.info(f"✅ Student report {action} for {student_id}, test {test_num}: mark={report_data['mark']}, avg={report_data['average']}")
    
    return report
