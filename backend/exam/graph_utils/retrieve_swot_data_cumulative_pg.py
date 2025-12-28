"""
PostgreSQL-based SWOT data retrieval (Cumulative - across all tests)
Replaces Neo4j graph queries with PostgreSQL table queries.
"""

import pandas as pd
import math
from django.db.models import Count, Q, Sum, Case, When, IntegerField, FloatField, F
from exam.models.response import StudentResponse
from exam.models.analysis import QuestionAnalysis
from exam.models.result import StudentResult
from exam.models.test import Test

# --------------------- Threshold Constants ---------------------
STRENGTH_WEIGHTED_THRESHOLD = 0.6
WEAKNESS_WEIGHTED_THRESHOLD = 0.9


def calculate_weighted_score(total, correct):
    if total == 0:
        return 0.0
    accuracy = correct / total
    return round(accuracy * math.log10(total + 1), 4)


def calculate_improvement_rate(score_list):
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


# --------------------- Data Fetching Helpers (PostgreSQL) ---------------------

def fetch_topic_scores_pg(student_id, class_id):
    """
    Fetch topic scores across all tests for a student.
    Returns: DataFrame with columns [TestName, Subject, Topic, Total, Correct]
    """
    # Get all test results for the student
    results = StudentResult.objects.filter(
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
    
    records = []
    for r in results:
        records.append({
            'TestName': f"Test{r['test_num']}",
            'Subject': r['subject'],
            'Topic': r['topic'],
            'Total': r['total'],
            'Correct': r['correct']
        })
    
    return pd.DataFrame(records)


def fetch_correct_questions_pg(student_id, class_id, subject, topics):
    """
    Fetch correct questions for specific topics across all tests.
    Returns: DataFrame with question metadata
    """
    # Get question numbers that student answered correctly
    correct_question_nums = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        subject=subject,
        topic__in=topics,
        is_correct=True
    ).values_list('test_num', 'question_number')
    
    # Build list of (test_num, question_number) tuples
    correct_pairs = list(correct_question_nums)
    
    if not correct_pairs:
        return pd.DataFrame()
    
    # Fetch question details from QuestionAnalysis
    records = []
    for test_num, q_num in correct_pairs:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            # Get student response
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            selected_answer = response.selected_answer if response else None
            
            # Determine which option was selected to get feedback
            feedback = ""
            mis_type = ""
            mis_desc = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Topic': qa.topic,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': selected_answer or '',
                'QuestionText': qa.question_text,
                'Type': qa.typeOfquestion,
                'ImgDesc': qa.im_desp or '',
                'Feedback': feedback,
                'MisType': mis_type,
                'MisDesc': mis_desc,
                'IsCorrect': True
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)] if not df.empty else df


def fetch_all_questions_pg(student_id, class_id, subject, topics):
    """
    Fetch all attempted questions for specific topics across all tests.
    Returns: DataFrame with question metadata including correctness
    """
    # Get all question numbers student attempted
    attempted_questions = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        subject=subject,
        topic__in=topics
    ).values_list('test_num', 'question_number', 'is_correct')
    
    attempted_list = list(attempted_questions)
    
    if not attempted_list:
        return pd.DataFrame()
    
    records = []
    for test_num, q_num, is_correct in attempted_list:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            selected_answer = response.selected_answer if response else None
            
            feedback = ""
            mis_type = ""
            mis_desc = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Topic': qa.topic,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': selected_answer or '',
                'QuestionText': qa.question_text,
                'Type': qa.typeOfquestion,
                'ImgDesc': qa.im_desp or '',
                'Feedback': feedback,
                'MisType': mis_type,
                'MisDesc': mis_desc,
                'IsCorrect': is_correct
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)] if not df.empty else df


def fetch_wrong_questions_pg(student_id, class_id, subject, topics):
    """
    Fetch wrong questions for specific topics across all tests.
    Returns: DataFrame with question metadata
    """
    # Get question numbers that student answered incorrectly
    wrong_question_nums = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        subject=subject,
        topic__in=topics,
        is_correct=False
    ).values_list('test_num', 'question_number')
    
    wrong_pairs = list(wrong_question_nums)
    
    if not wrong_pairs:
        return pd.DataFrame()
    
    records = []
    for test_num, q_num in wrong_pairs:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            selected_answer = response.selected_answer if response else None
            
            feedback = ""
            mis_type = ""
            mis_desc = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Topic': qa.topic,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': selected_answer or '',
                'QuestionText': qa.question_text,
                'Type': qa.typeOfquestion,
                'ImgDesc': qa.im_desp or '',
                'Feedback': feedback,
                'MisType': mis_type,
                'MisDesc': mis_desc
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)] if not df.empty else df


def fetch_question_type_scores_pg(student_id, class_id):
    """
    Fetch question type performance across all tests.
    Returns: DataFrame with columns [Subject, Type, Total, Correct]
    """
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num', 'subject', 'question_number')
    
    # Get question types from QuestionAnalysis
    records = []
    processed = set()
    
    for r in results:
        key = (r['test_num'], r['question_number'])
        if key in processed:
            continue
        processed.add(key)
        
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=r['test_num'],
                question_number=r['question_number']
            )
            
            student_result = StudentResult.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=r['test_num'],
                question_number=r['question_number']
            ).first()
            
            is_correct = student_result.is_correct if student_result else False
            
            records.append({
                'Subject': r['subject'],
                'Type': qa.typeOfquestion,
                'IsCorrect': is_correct
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    # Aggregate by subject and type
    df = pd.DataFrame(records)
    if df.empty:
        return df
    
    grouped = df.groupby(['Subject', 'Type']).agg(
        Total=('IsCorrect', 'count'),
        Correct=('IsCorrect', 'sum')
    ).reset_index()
    
    return grouped


def fetch_wrong_questions_by_qtype_pg(student_id, class_id, subject, types):
    """
    Fetch wrong questions filtered by question types.
    """
    wrong_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        subject=subject,
        is_correct=False
    ).values_list('test_num', 'question_number')
    
    records = []
    for test_num, q_num in wrong_results:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            if qa.typeOfquestion not in types:
                continue
            
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            selected_answer = response.selected_answer if response else None
            
            feedback = ""
            mis_type = ""
            mis_desc = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Type': qa.typeOfquestion,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': selected_answer or '',
                'QuestionText': qa.question_text,
                'ImgDesc': qa.im_desp or '',
                'Feedback': feedback,
                'MisType': mis_type,
                'MisDesc': mis_desc
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Type"].isin(types)] if not df.empty and "Type" in df.columns else df


def fetch_correct_questions_by_qtype_pg(student_id, class_id, subject, types):
    """
    Fetch correct questions filtered by question types.
    """
    correct_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        subject=subject,
        is_correct=True
    ).values_list('test_num', 'question_number')
    
    records = []
    for test_num, q_num in correct_results:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            if qa.typeOfquestion not in types:
                continue
            
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            selected_answer = response.selected_answer if response else None
            
            feedback = ""
            mis_type = ""
            mis_desc = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Type': qa.typeOfquestion,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': selected_answer or '',
                'QuestionText': qa.question_text,
                'ImgDesc': qa.im_desp or '',
                'Feedback': feedback,
                'MisType': mis_type,
                'MisDesc': mis_desc
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Type"].isin(types)] if not df.empty and "Type" in df.columns else df


# --------------------- Analysis Functions (PostgreSQL) ---------------------

def best_topics_pg(student_id, class_id):
    """PostgreSQL version of best_topics analysis"""
    df_scores = fetch_topic_scores_pg(student_id, class_id)
    
    if df_scores.empty:
        return {}
        
    df_scores["WeightedScore"] = df_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    topic_metrics = []
    for (subject, topic), group in df_scores.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        weighted_score = group["WeightedScore"].mean()
        topic_metrics.append({
            "Subject": subject,
            "Topic": topic,
            "WeightedScore": weighted_score,
            "ImprovementRate": improvement_rate
        })
    
    df_topic_metrics = pd.DataFrame(topic_metrics)
    best_topics_df = df_topic_metrics.sort_values(
        by=["WeightedScore", "ImprovementRate"], ascending=False
    ).groupby("Subject").head(10)
    
    # Filter by threshold
    best_topics_df = best_topics_df[best_topics_df["WeightedScore"] >= STRENGTH_WEIGHTED_THRESHOLD]
    
    subject_data = {}
    for subject, group in best_topics_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        if topics:
            df = fetch_correct_questions_pg(student_id, class_id, subject, topics)
            subject_data[subject] = df.to_dict(orient='records')
        else:
            subject_data[subject] = []
    
    return subject_data


def most_challenging_topics_pg(student_id, class_id):
    """PostgreSQL version of most_challenging_topics analysis"""
    df_scores = fetch_topic_scores_pg(student_id, class_id)
    
    if df_scores.empty:
        return {}
    
    df_scores["WeightedScore"] = df_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    topic_metrics = []
    for (subject, topic), group in df_scores.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        weighted_score = group["WeightedScore"].mean()
        topic_metrics.append({
            "Subject": subject,
            "Topic": topic,
            "WeightedScore": weighted_score,
            "ImprovementRate": improvement_rate
        })
    
    df_topic_metrics = pd.DataFrame(topic_metrics)
    challenging_df = df_topic_metrics.sort_values(
        by=["WeightedScore", "ImprovementRate"], ascending=True
    ).groupby("Subject").head(10)
    
    # Filter by threshold
    challenging_df = challenging_df[challenging_df["WeightedScore"] < WEAKNESS_WEIGHTED_THRESHOLD]
    
    subject_data = {}
    for subject, group in challenging_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        if topics:
            df = fetch_wrong_questions_pg(student_id, class_id, subject, topics)
            subject_data[subject] = df.to_dict(orient='records')
        else:
            subject_data[subject] = []
    
    return subject_data


def rapid_learning_pg(student_id, class_id):
    """PostgreSQL version of rapid_learning analysis"""
    df_scores = fetch_topic_scores_pg(student_id, class_id)
    
    if df_scores.empty:
        return {}
    
    df_scores["WeightedScore"] = df_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    topic_metrics = []
    for (subject, topic), group in df_scores.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        weighted_score = group["WeightedScore"].mean()
        topic_metrics.append({
            "Subject": subject,
            "Topic": topic,
            "WeightedScore": weighted_score,
            "ImprovementRate": improvement_rate
        })
    
    df_topic_metrics = pd.DataFrame(topic_metrics)
    rapid_df = df_topic_metrics.sort_values(
        by="ImprovementRate", ascending=False
    ).groupby("Subject").head(10)
    
    subject_data = {}
    for subject, group in rapid_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions_pg(student_id, class_id, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    
    return subject_data


# Additional functions can be added following the same pattern...
# (improvement_over_time_pg, strongest_question_type_pg, weakness_over_time_pg, etc.)
