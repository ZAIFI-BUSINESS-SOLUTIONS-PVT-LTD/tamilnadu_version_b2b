# summary_metrics.py

from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager
from exam.models.response import StudentResponse
from exam.models.analysis import QuestionAnalysis
from exam.models.result import StudentResult
from exam.models.test import Test
from django.db.models import Count, Q, Sum, Case, When, IntegerField, FloatField
import pandas as pd
import numpy as np

# ============================================================================
# POSTGRES-BASED IMPLEMENTATIONS (New)
# ============================================================================

def calculate_overall_performance_pg(student_id, class_id):
    """
    Calculate overall performance from PostgreSQL tables.
    Returns: overall performance percentage
    """
    # Get all student results for this student and class
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).aggregate(
        total_questions=Count('question_number'),
        correct_questions=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        ),
        incorrect_questions=Sum(
            Case(
                When(Q(is_correct=False) & Q(was_attempted=True), then=1),
                default=0,
                output_field=IntegerField()
            )
        ),
        skipped_questions=Sum(
            Case(
                When(Q(is_correct=False) & Q(was_attempted=False), then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    total = results['total_questions'] or 0
    correct = results['correct_questions'] or 0
    incorrect = results['incorrect_questions'] or 0
    skipped = results['skipped_questions'] or 0
    
    if total == 0:
        return 0.0
    
    # Calculate score: +4 for correct, -1 for incorrect, 0 for skipped
    total_score = (correct * 4) - (incorrect * 1) + (skipped * 0)
    max_possible_score = total * 4
    
    return round((total_score / max_possible_score) * 100, 2)


def fetch_tests_taken_count_pg(student_id, class_id):
    """
    Count total tests taken by student from PostgreSQL.
    Returns: count of tests
    """
    count = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num').distinct().count()
    
    return count


def calculate_improvement_rate_pg(student_id, class_id):
    """
    Calculate improvement rate across tests from PostgreSQL.
    Returns: improvement rate percentage
    """
    # Get scores per test
    test_scores = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num').annotate(
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
        ),
        total=Count('question_number')
    ).order_by('test_num')
    
    scores = []
    for test in test_scores:
        correct = test['correct']
        incorrect = test['incorrect']
        # Score: +4 correct, -1 incorrect, 0 skipped
        score = (correct * 4) - (incorrect * 1)
        scores.append(score)
    
    if len(scores) < 2:
        return 0.0
    
    deltas = []
    for i in range(1, len(scores)):
        prev, curr = scores[i - 1], scores[i]
        if prev == 0:
            continue
        deltas.append(((curr - prev) / abs(prev)) * 100)
    
    return round(sum(deltas) / len(deltas), 2) if deltas else 0.0


def calculate_consistency_score_pg(student_id, class_id):
    """
    Calculate consistency score across topics from PostgreSQL.
    Returns: consistency score (0-1)
    """
    # Get topic-wise accuracy per test
    topic_data = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num', 'subject', 'topic').annotate(
        total=Count('question_number'),
        correct=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('test_num', 'subject', 'topic')
    
    if not topic_data:
        return 0.0
    
    # Convert to DataFrame for easier groupby operations
    df = pd.DataFrame(list(topic_data))
    df['accuracy'] = df['correct'] / df['total']
    
    topic_scores = []
    for (subject, topic), group in df.groupby(['subject', 'topic']):
        accuracies = group['accuracy'].tolist()
        if len(accuracies) < 2:
            continue
        avg = np.mean(accuracies)
        std = np.std(accuracies)
        topic_scores.append(avg / (1 + std))
    
    return round(np.mean(topic_scores), 4) if topic_scores else 0.0


def calculate_metrics_pg(student_id, class_id):
    """
    PostgreSQL-based metrics calculation.
    Returns: (op, tt, ir, cv) tuple
    """
    op = calculate_overall_performance_pg(student_id, class_id)
    tt = fetch_tests_taken_count_pg(student_id, class_id)
    
    # Normalize by test count
    if tt > 0:
        op = op / tt
    
    ir = calculate_improvement_rate_pg(student_id, class_id)
    cv = calculate_consistency_score_pg(student_id, class_id)
    
    return (op, tt, ir, cv)


# ============================================================================
# NEO4J-BASED IMPLEMENTATIONS (Legacy - kept for backward compatibility)
# ============================================================================

# 1️⃣ Overall Performance
def calculate_overall_performance(kg_manager):
    query = """
    MATCH (q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH COUNT(q) AS TotalQuestions,
         SUM(CASE WHEN q.isCorrect = true THEN 4
                  WHEN q.isCorrect = false THEN -1
                  ELSE 0 END) AS TotalScore
    RETURN TotalQuestions, TotalScore
    """
    with kg_manager.get_session() as session:
        record = session.run(query).single()
        total_questions = record["TotalQuestions"]
        total_score = record["TotalScore"]

    if total_questions == 0:
        return 0.0

    return round((total_score / (total_questions*4)) * 100, 2)


# 2️⃣ Total Tests Taken
def fetch_tests_taken_count(kg_manager):
    query = "MATCH (t:Test) RETURN COUNT(t) AS TestsTaken"
    with kg_manager.get_session() as session:
        record = session.run(query).single()
        result = record["TestsTaken"] if record else 0
        return result
        


# 3️⃣ Improvement Rate
def calculate_improvement_rate(kg_manager):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(:Subject)-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH t.name AS TestName,
         SUM(CASE WHEN q.isCorrect = true THEN 4
                  WHEN q.isCorrect = false THEN -1
                  ELSE 0 END) AS Score
    RETURN TestName, Score
    ORDER BY TestName
    """
    with kg_manager.get_session() as session:
        result = session.run(query)
        
        records = [r.data() for r in result]

        warnings = result.consume()

    scores = sorted(records, key=lambda x: x["TestName"])
    if len(scores) < 2:
        return 0.0

    deltas = []
    for i in range(1, len(scores)):
        prev, curr = scores[i - 1]["Score"], scores[i]["Score"]
        if prev == 0:
            continue
        deltas.append(((curr - prev) / abs(prev)) * 100)

    return round(sum(deltas) / len(deltas), 2) if deltas else 0.0


# 4️⃣ Consistency Score
def calculate_consistency_score(kg_manager):
    query = """
MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(:CHAPTER)-[:CONTAINS]->(tp:Topic)
      -[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
WHERE q.optedAnswer IS NOT NULL AND q.isCorrect IS NOT NULL
WITH 
    t.name AS test_name,
    s.name AS subject,
    tp.name AS topic,
    COUNT(q) AS total_questions,
    SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS correct_questions
WITH 
    test_name, subject, topic,
    1.0 * correct_questions / total_questions AS accuracy
RETURN test_name, subject, topic, accuracy
ORDER BY test_name

    """
    with kg_manager.get_session() as session:
        result = session.run(query)
        df = pd.DataFrame([r.data() for r in result])
        warnings = result.consume()

    if df.empty:
        return 0.0

    topic_scores = []
    for (subject, topic), group in df.groupby(["subject", "topic"]):
        accuracies = group["accuracy"].tolist()
        if len(accuracies) < 2:
            continue
        avg = np.mean(accuracies)
        std = np.std(accuracies)
        topic_scores.append(avg / (1 + std))

    return round(np.mean(topic_scores), 4) if topic_scores else 0.0


# ✅ Combined summary function (uses shared kg_manager)
def calculate_metrics(db_name):
    kg_manager = KnowledgeGraphManager(database_name=db_name)

    op = calculate_overall_performance(kg_manager)
    tt = fetch_tests_taken_count(kg_manager)
    op = op/tt 
    ir = calculate_improvement_rate(kg_manager)
    cv = calculate_consistency_score(kg_manager)

    kg_manager.close()

    return (op,tt,ir,cv)

