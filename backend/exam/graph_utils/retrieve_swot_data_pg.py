"""
PostgreSQL-based SWOT data retrieval (Single Test)
Replaces Neo4j graph queries with PostgreSQL table queries for specific test.
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
WEAKNESS_WEIGHTED_THRESHOLD = 0.85


def calculate_weighted_score(total, correct):
    if total == 0:
        return 0.0
    accuracy = correct / total
    return round(accuracy * math.log10(total + 1), 4)


# --------------------- Data Fetching Helpers (PostgreSQL - Single Test) ---------------------

def fetch_topic_scores_analysis_pg(student_id, class_id, test_num):
    """
    Fetch topic scores for a specific test.
    Match Neo4j: WHERE q.optedAnswer IS NOT NULL means was_attempted=True
    Returns: DataFrame with columns [TestName, Subject, Topic, Total, Correct]
    """
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        was_attempted=True  # Only attempted questions like Neo4j
    ).values('test_num', 'subject', 'topic').annotate(
        total=Count('question_number'),
        correct=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('subject', 'topic')
    
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


def fetch_correct_questions_analysis_pg(student_id, class_id, test_num, subject, topics):
    """
    Fetch correct questions for specific topics in a specific test.
    Returns: DataFrame with question metadata
    """
    correct_question_nums = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        subject=subject,
        topic__in=topics,
        is_correct=True
    ).values_list('question_number')
    
    question_numbers = [q[0] for q in correct_question_nums]
    
    if not question_numbers:
        return pd.DataFrame()
    
    records = []
    for q_num in question_numbers:
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
            
            # Get actual option text for better LLM understanding
            option_text = ""
            feedback = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                option_text = getattr(qa, f'option_{option_num}', '')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Topic': qa.topic,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': option_text or selected_answer or '',
                'QuestionText': qa.question_text,
                'Type': qa.typeOfquestion,
                'ImgDesc': qa.im_desp or '',
                'Feedback': feedback,
                'IsCorrect': True
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)] if not df.empty else df


def fetch_all_questions_analysis_pg(student_id, class_id, test_num, subject, topics):
    """
    Fetch all attempted questions for specific topics in a specific test.
    Returns: DataFrame with question metadata including correctness
    """
    attempted_questions = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        subject=subject,
        topic__in=topics
    ).values_list('question_number', 'is_correct')
    
    attempted_list = list(attempted_questions)
    
    if not attempted_list:
        return pd.DataFrame()
    
    records = []
    for q_num, is_correct in attempted_list:
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


def fetch_wrong_questions_analysis_pg(student_id, class_id, test_num, subject, topics):
    """
    Fetch wrong questions for specific topics in a specific test.
    Returns: DataFrame with question metadata
    """
    wrong_question_nums = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        subject=subject,
        topic__in=topics,
        is_correct=False
    ).values_list('question_number')
    
    question_numbers = [q[0] for q in wrong_question_nums]
    
    if not question_numbers:
        return pd.DataFrame()
    
    records = []
    for q_num in question_numbers:
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
            
            # Get actual option text for better LLM understanding
            option_text = ""
            mis_type = ""
            mis_desc = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                option_text = getattr(qa, f'option_{option_num}', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
            
            records.append({
                'TestName': f"Test{test_num}",
                'Topic': qa.topic,
                'Subtopic': qa.subtopic,
                'QuestionNumber': qa.question_number,
                'OptedAnswer': option_text or selected_answer or '',
                'QuestionText': qa.question_text,
                'Type': qa.typeOfquestion,
                'ImgDesc': qa.im_desp or '',
                'MisType': mis_type,
                'MisDesc': mis_desc
            })
        except QuestionAnalysis.DoesNotExist:
            continue
    
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)] if not df.empty else df


def fetch_question_type_scores_analysis_pg(student_id, class_id, test_num):
    """
    Fetch question type performance for a specific test.
    Match Neo4j: WHERE q.optedAnswer IS NOT NULL means was_attempted=True
    Returns: DataFrame with columns [Subject, Type, Total, Correct]
    """
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        was_attempted=True  # Only attempted questions like Neo4j
    ).values('subject', 'question_number')
    
    records = []
    processed = set()
    
    for r in results:
        key = (test_num, r['question_number'])
        if key in processed:
            continue
        processed.add(key)
        
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=r['question_number']
            )
            
            student_result = StudentResult.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
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
    
    df = pd.DataFrame(records)
    if df.empty:
        return df
    
    grouped = df.groupby(['Subject', 'Type']).agg(
        Total=('IsCorrect', 'count'),
        Correct=('IsCorrect', 'sum')
    ).reset_index()
    
    return grouped


def fetch_wrong_questions_by_qtype_analysis_pg(student_id, class_id, test_num, subject, types):
    """
    Fetch wrong questions filtered by question types for a specific test.
    """
    wrong_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        subject=subject,
        is_correct=False
    ).values_list('question_number')
    
    records = []
    for (q_num,) in wrong_results:
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


def fetch_correct_questions_by_qtype_analysis_pg(student_id, class_id, test_num, subject, types):
    """
    Fetch correct questions filtered by question types for a specific test.
    """
    correct_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        subject=subject,
        is_correct=True
    ).values_list('question_number')
    
    records = []
    for (q_num,) in correct_results:
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


# --------------------- Analysis Functions (PostgreSQL - Single Test) ---------------------

def best_topic_analysis_pg(student_id, class_id, test_num):
    """PostgreSQL version of best_topic_analysis for a specific test"""
    df_scores = fetch_topic_scores_analysis_pg(student_id, class_id, test_num)
    
    if df_scores.empty:
        return {}
    
    df_scores["WeightedScore"] = df_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    # Select top topics per subject
    best_topics_df = df_scores.sort_values(
        by=["WeightedScore"], ascending=False
    ).groupby("Subject").head(10)
    
    # Cascading threshold: try 0.6, then 0.5, then 0.4 to ensure data is returned
    thresholds = [STRENGTH_WEIGHTED_THRESHOLD, 0.5, 0.4]
    filtered_df = pd.DataFrame()  # Start with empty
    
    for threshold in thresholds:
        filtered_df = best_topics_df[best_topics_df["WeightedScore"] >= threshold]
        # Check if we have at least some data for any subject
        if not filtered_df.empty:
            break
    
    subject_data = {}
    for subject, group in filtered_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        if topics:
            df = fetch_correct_questions_analysis_pg(student_id, class_id, test_num, subject, topics)
            # Group by topic for better LLM understanding
            topic_grouped = {}
            for topic, topic_df in df.groupby('Topic'):
                topic_grouped[topic] = topic_df.to_dict(orient='records')
            subject_data[subject] = topic_grouped
        else:
            subject_data[subject] = {}
    
    return subject_data


def most_challenging_topic_analysis_pg(student_id, class_id, test_num):
    """PostgreSQL version of most_challenging_topic_analysis for a specific test"""
    df_scores = fetch_topic_scores_analysis_pg(student_id, class_id, test_num)
    
    if df_scores.empty:
        return {}
    
    df_scores["WeightedScore"] = df_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    challenging_df = df_scores.sort_values(
        by=["WeightedScore"], ascending=True
    ).groupby("Subject").head(10)
    
    challenging_df = challenging_df[challenging_df["WeightedScore"] < WEAKNESS_WEIGHTED_THRESHOLD]
    
    subject_data = {}
    for subject, group in challenging_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        if topics:
            df = fetch_wrong_questions_analysis_pg(student_id, class_id, test_num, subject, topics)
            # Group by topic for better LLM understanding
            topic_grouped = {}
            for topic, topic_df in df.groupby('Topic'):
                topic_grouped[topic] = topic_df.to_dict(orient='records')
            subject_data[subject] = topic_grouped
        else:
            subject_data[subject] = {}
    
    return subject_data


def rapid_learning_analysis_pg(student_id, class_id, test_num):
    """PostgreSQL version of rapid_learning_analysis for a specific test"""
    # For a single test, rapid learning is harder to detect
    # Return all questions with their status
    df_scores = fetch_topic_scores_analysis_pg(student_id, class_id, test_num)
    
    if df_scores.empty:
        return {}
    
    subject_data = {}
    for subject, group in df_scores.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions_analysis_pg(student_id, class_id, test_num, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    
    return subject_data


def strongest_question_type_analysis_pg(student_id, class_id, test_num):
    """PostgreSQL version of strongest question type analysis"""
    df_qtype_scores = fetch_question_type_scores_analysis_pg(student_id, class_id, test_num)
    
    if df_qtype_scores.empty:
        return {}
    
    df_qtype_scores["WeightedScore"] = df_qtype_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    strongest_qtype = df_qtype_scores.sort_values(
        by=["WeightedScore"], ascending=False
    ).groupby("Subject").head(5)
    
    strongest_qtype = strongest_qtype[strongest_qtype["WeightedScore"] >= STRENGTH_WEIGHTED_THRESHOLD]
    
    subject_data = {}
    for subject, group in strongest_qtype.groupby("Subject"):
        types = group["Type"].tolist()
        if types:
            df = fetch_correct_questions_by_qtype_analysis_pg(student_id, class_id, test_num, subject, types)
            subject_data[subject] = df.to_dict(orient='records')
        else:
            subject_data[subject] = []
    
    return subject_data


def weakest_question_type_analysis_pg(student_id, class_id, test_num):
    """PostgreSQL version of weakest question type analysis"""
    df_qtype_scores = fetch_question_type_scores_analysis_pg(student_id, class_id, test_num)
    
    if df_qtype_scores.empty:
        return {}
    
    df_qtype_scores["WeightedScore"] = df_qtype_scores.apply(
        lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1
    )
    
    weakest_qtype = df_qtype_scores.sort_values(
        by=["WeightedScore"], ascending=True
    ).groupby("Subject").head(5)
    
    weakest_qtype = weakest_qtype[weakest_qtype["WeightedScore"] < WEAKNESS_WEIGHTED_THRESHOLD]
    
    subject_data = {}
    for subject, group in weakest_qtype.groupby("Subject"):
        types = group["Type"].tolist()
        if types:
            df = fetch_wrong_questions_by_qtype_analysis_pg(student_id, class_id, test_num, subject, types)
            subject_data[subject] = df.to_dict(orient='records')
        else:
            subject_data[subject] = []
    
    return subject_data
