"""
PostgreSQL-based performance data retrieval
Replaces Neo4j graph queries with PostgreSQL table queries.
"""

from django.db.models import Count, Sum, Case, When, IntegerField, F, Q
from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis


def get_overview_data_pg(student_id, class_id):
    """
    PostgreSQL version of performance data fetching
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
    
    Returns:
        tuple: (performance_graph, performance_data)
    """
    performance_graph = fetch_chapter_topic_graph_pg(student_id, class_id)
    performance_data = fetch_full_chapter_topic_data_pg(student_id, class_id)

    return performance_graph, performance_data


def fetch_chapter_topic_graph_pg(student_id, class_id):
    """
    Returns nested dictionary structured as:
    {
        Subject1: {
            Chapter1: {
                "chapter_accuracy": { Test1: %, Test2: %, ... },
                "topics": {
                    Topic1: { Test1: %, ... },
                    ...
                }
            },
            ...
        },
        ...
    }
    """
    # Step 1: Chapter-level accuracy
    # Match Neo4j: WHERE q.optedAnswer IS NOT NULL means was_attempted=True
    chapter_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        was_attempted=True  # Only count attempted questions like Neo4j
    ).values('test_num', 'subject', 'chapter').annotate(
        total_questions=Count('question_number'),
        correct_answers=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('subject', 'chapter', 'test_num')
    
    hierarchy = {}
    
    for record in chapter_results:
        subject = record['subject']
        chapter = record['chapter']
        test = f"Test{record['test_num']}"
        total = record['total_questions']
        correct = record['correct_answers']
        
        if total > 0:
            accuracy = round(100.0 * correct / total, 2)
            
            hierarchy.setdefault(subject, {})
            hierarchy[subject].setdefault(chapter, {
                "chapter_accuracy": {},
                "topics": {}
            })
            hierarchy[subject][chapter]["chapter_accuracy"][test] = accuracy
    
    # Step 2: Topic-level accuracy
    # Match Neo4j: WHERE q.optedAnswer IS NOT NULL means was_attempted=True
    topic_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        was_attempted=True  # Only count attempted questions like Neo4j
    ).values('test_num', 'subject', 'chapter', 'topic').annotate(
        total_questions=Count('question_number'),
        correct_answers=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('subject', 'chapter', 'topic', 'test_num')
    
    for record in topic_results:
        subject = record['subject']
        chapter = record['chapter']
        topic = record['topic']
        test = f"Test{record['test_num']}"
        total = record['total_questions']
        correct = record['correct_answers']
        
        if total > 0 and subject in hierarchy and chapter in hierarchy[subject]:
            accuracy = round(100.0 * correct / total, 2)
            
            hierarchy[subject][chapter]["topics"].setdefault(topic, {})
            hierarchy[subject][chapter]["topics"][topic][test] = accuracy
    
    return hierarchy


def fetch_full_chapter_topic_data_pg(student_id, class_id):
    """
    Fetches subject → chapter → topic → list of feedback comments.
    Returns dict compatible with frontend.
    """
    # Get all questions attempted by student
    # Match Neo4j: only questions where optedAnswer IS NOT NULL
    attempted_questions = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        was_attempted=True  # Only attempted questions like Neo4j
    ).values_list('test_num', 'question_number', 'subject', 'chapter', 'topic')
    
    subject_map = {}
    
    for test_num, q_num, subject, chapter, topic in attempted_questions:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            # Get student's selected answer to retrieve correct feedback
            from exam.models.response import StudentResponse
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            if response and response.selected_answer:
                # Map answer to option number
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(response.selected_answer).strip().upper(), '1')
                
                # Get feedback for selected option
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                
                if feedback:
                    subject_map \
                        .setdefault(subject, {}) \
                        .setdefault(chapter, {}) \
                        .setdefault(topic, []) \
                        .append(feedback)
        except QuestionAnalysis.DoesNotExist:
            continue
    
    return subject_map
