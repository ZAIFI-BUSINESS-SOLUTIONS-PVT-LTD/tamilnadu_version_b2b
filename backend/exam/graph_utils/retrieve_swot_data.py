
import pandas as pd
import numpy as np
import math
from collections import defaultdict

# --------------------- Utility Functions ---------------------
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

def calculate_accuracy(total, correct):
    if total == 0:
        return 0.0
    return round(correct / total, 4)

# --------------------- Data Fetching Helpers ---------------------
def fetch_topic_scores(kg_manager):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject)-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH t.name AS TestName, sub.name AS Subject, tp.name AS Topic,
         COUNT(q) AS Total, SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS Correct
    RETURN TestName, Subject, Topic, Total, Correct
    """
    records = kg_manager.run_query(query)
    return pd.DataFrame(records)

def fetch_topic_scores_per_test(kg_manager):
    return fetch_topic_scores(kg_manager)

def fetch_correct_questions(kg_manager, test_name, subject, topics):
    query = """
    MATCH (:Test {name: $test_name})-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE tp.name IN $topics AND q.isCorrect = true
    RETURN tp.name AS Topic, st.name AS Subtopic, 
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer, 
           q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
    """
    records = kg_manager.run_query(query, test_name=test_name, subject=subject, topics=topics)
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)]

def fetch_all_questions(kg_manager, test_name, subject, topics):
    query = """
    MATCH (:Test {name: $test_name})-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE tp.name IN $topics AND q.optedAnswer IS NOT NULL
    RETURN tp.name AS Topic, st.name AS Subtopic, 
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer, 
           q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
           q.isCorrect AS IsCorrect,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
    """
    records = kg_manager.run_query(query, test_name=test_name, subject=subject, topics=topics)
    df = pd.DataFrame(records)
    if "Topic" not in df.columns:
        print("topic column missing, returning empty DataFrame")
        return df  # or pd.DataFrame()
    return df[df["Topic"].isin(topics)]

def fetch_wrong_questions(kg_manager, test_name, subject, topics):
    query = """
    MATCH (:Test {name: $test_name})-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE tp.name IN $topics AND q.isCorrect = false
    RETURN tp.name AS Topic, st.name AS Subtopic, 
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer, 
           q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
    """
    records = kg_manager.run_query(query, test_name=test_name, subject=subject, topics=topics)
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)]

def fetch_question_type_scores(kg_manager, test_name):
    query = """
    MATCH (:Test {name: $test_name})-[:CONTAINS]->(sub:Subject)-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    RETURN sub.name AS Subject, q.type AS QuestionType,
           COUNT(q) AS Total, SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS Correct
    """
    records = kg_manager.run_query(query, test_name=test_name)
    return pd.DataFrame(records)

# --------------------- Analysis Functions ---------------------
def best_topic_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "best_topic" containing topics selected based on highest WeightedScore 
      and ImprovementRate (both descending) with correct question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    print("DEBUG: topic_metrics =", topic_metrics)
    df_topic_metrics = pd.DataFrame(topic_metrics)
    best_topics = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=False).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in best_topics.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_correct_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def improvement_over_time_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "improvement_over_time" containing topics selected based on highest ImprovementRate 
      then WeightedScore (descending) with correct question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    top_topics = df_topic_metrics.sort_values(by=["ImprovementRate", "WeightedScore"], ascending=False).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in top_topics.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_correct_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def inconsistent_performance_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "inconsistent_performance" containing topics with highest StdDev of WeightedAccuracy
      and all attempted question metadata (correct and wrong).
    """
    df_scores = fetch_topic_scores_per_test(kg_manager)
    df_scores["WeightedAccuracy"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    std_df = df_scores.groupby(["Subject", "Topic"])["WeightedAccuracy"].agg(lambda x: round(np.std(x, ddof=0), 4)).reset_index().rename(columns={"WeightedAccuracy": "StdDev"})
    inconsistent = std_df.sort_values(by="StdDev", ascending=False).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in inconsistent.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_all_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def low_retention_rate_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "low_retention_rate" containing topics (with ImprovementRate in [0.0, 0.9]) 
      sorted by lowest Accuracy then highest TotalQuestions; returns wrong question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    df_all["Accuracy"] = df_all.apply(lambda row: calculate_accuracy(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            accuracy = current_data["Accuracy"].values[0]
            total_questions = current_data["Total"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "Accuracy": accuracy,
                "Total": total_questions,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    filtered = df_topic_metrics[(df_topic_metrics["ImprovementRate"] >= 0.0) & (df_topic_metrics["ImprovementRate"] <= 0.9)]
    low_retention = filtered.sort_values(by=["Accuracy", "Total"], ascending=[True, False]).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in low_retention.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_wrong_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def missed_opportunities_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "missed_opportunities" containing topics selected based on high WeightedScore and low ImprovementRate 
      (sorted by WeightedScore descending and ImprovementRate ascending) with all question metadata (correct and wrong).
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    missed = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=[False, True]).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in missed.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_all_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def most_challenging_topic_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "most_challenging_topic" containing topics selected based on lowest WeightedScore and lowest ImprovementRate 
      (sorted ascending by both) with wrong question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    challenging = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=True).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in challenging.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_wrong_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def practice_recommendation_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "practice_recommendation" containing the middle 10 topics (by WeightedScore and ImprovementRate descending)
      with all question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    # Sort and then select the middle 10 rows per subject
    df_topic_metrics = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=False)
    midrange = df_topic_metrics.groupby("Subject").apply(lambda g: g.iloc[max(len(g)//2 - 5, 0):min(len(g)//2 + 5, len(g))]).reset_index(drop=True)
    subject_dfs = {}
    for subject, group in midrange.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_all_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def rapid_learning_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "rapid_learning_topic" containing the top 10 topics based on highest ImprovementRate (descending)
      with all question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    rapid = df_topic_metrics.sort_values(by="ImprovementRate", ascending=False).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in rapid.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_all_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def recurring_mistake_conceptual_gap_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "recurring_mistake_conceptual_gap" containing the bottom 3 question types (by WeightedScore)
      with wrongly answered question metadata.
    """
    df_scores = fetch_question_type_scores(kg_manager, test_name)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    bottom_types = df_scores.sort_values(by="WeightedScore", ascending=True).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in bottom_types.groupby("Subject"):
        types = group["QuestionType"].tolist()
        with kg_manager.driver.session(database=kg_manager.database_name) as session:
            selected_types = defaultdict(set)
            for _, row in group.iterrows():
                selected_types[subject].add(row["QuestionType"])
            type_list = list(selected_types[subject])
            query = """
            MATCH (:Test {name: $test_name})-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
                  -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
            OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
            OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
            WHERE q.type IN $question_types AND q.isCorrect = false
            RETURN q.type AS QuestionType, q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
                   q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
                   f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
            """
            records = session.run(query, test_name=test_name, subject=subject, question_types=type_list)
            recs = [r.data() for r in records]
            df_rec = pd.DataFrame(recs)
            subject_dfs[subject] = df_rec
    return subject_dfs

def strongest_question_type_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "strongest_question_type" containing the top 3 question types (by WeightedScore)
      with correctly answered question metadata.
    """
    df_scores = fetch_question_type_scores(kg_manager, test_name)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    top_types = df_scores.sort_values(by="WeightedScore", ascending=False).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in top_types.groupby("Subject"):
        types = group["QuestionType"].tolist()
        with kg_manager.driver.session(database=kg_manager.database_name) as session:
            query = """
            MATCH (:Test {name: $test_name})-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
                  -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
            OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
            OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
            WHERE q.type IN $question_types AND q.isCorrect = true
            RETURN q.type AS QuestionType, q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
                   q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
                   f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
            """
            records = session.run(query, test_name=test_name, subject=subject, question_types=types)
            recs = [r.data() for r in records]
            df_rec = pd.DataFrame(recs)
            subject_dfs[subject] = df_rec
    return subject_dfs

def weakness_on_high_impact_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "weakness_on_high_impact" containing topics with high Total (impact) and low Accuracy,
      with all question metadata (correct and wrong).
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["Accuracy"] = df_all.apply(lambda row: calculate_accuracy(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        current_data = group[group["TestName"] == test_name]
        if not current_data.empty:
            total = current_data["Total"].values[0]
            accuracy = current_data["Accuracy"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "Total": total,
                "Accuracy": accuracy
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    selected = df_topic_metrics.sort_values(by=["Total", "Accuracy"], ascending=[False, True]).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in selected.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_all_questions(kg_manager, test_name, subject, topics)
    return subject_dfs

def weakness_over_time_analysis(kg_manager, test_name):
    """
    Return Format:
      JSON per subject with tag "weakness_over_time" containing topics (bottom 10 by lowest ImprovementRate and WeightedScore)
      with wrong question metadata.
    """
    df_all = fetch_topic_scores(kg_manager)
    df_all["WeightedScore"] = df_all.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    topic_metrics = []
    for (subject, topic), group in df_all.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        current_data = group_sorted[group_sorted["TestName"] == test_name]
        if not current_data.empty:
            weighted_score = current_data["WeightedScore"].values[0]
            topic_metrics.append({
                "Subject": subject,
                "Topic": topic,
                "WeightedScore": weighted_score,
                "ImprovementRate": improvement_rate
            })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    weakest = df_topic_metrics.sort_values(by=["ImprovementRate", "WeightedScore"], ascending=True).groupby("Subject").head(3)
    subject_dfs = {}
    for subject, group in weakest.groupby("Subject"):
        topics = group["Topic"].tolist()
        subject_dfs[subject] = fetch_wrong_questions(kg_manager, test_name, subject, topics)
    return subject_dfs


