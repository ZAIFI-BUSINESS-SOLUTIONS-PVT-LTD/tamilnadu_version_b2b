import pandas as pd
import math


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

def fetch_correct_questions(kg_manager, subject, topics):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE tp.name IN $topics AND q.isCorrect = true
    RETURN t.name AS TestName, tp.name AS Topic, st.name AS Subtopic,
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
           q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc,
           q.isCorrect AS IsCorrect
    """
    records = kg_manager.run_query(query, subject=subject, topics=topics)
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)]

def fetch_all_questions(kg_manager, subject, topics):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE tp.name IN $topics AND q.optedAnswer IS NOT NULL
    RETURN t.name AS TestName, tp.name AS Topic, st.name AS Subtopic,
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
           q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc,
           q.isCorrect AS IsCorrect
    """
    records = kg_manager.run_query(query, subject=subject, topics=topics)
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)]

def fetch_wrong_questions(kg_manager, subject, topics):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE tp.name IN $topics AND q.isCorrect = false
    RETURN t.name AS TestName, tp.name AS Topic, st.name AS Subtopic,
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
           q.text AS QuestionText, q.type AS Type, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
    """
    records = kg_manager.run_query(query, subject=subject, topics=topics)
    df = pd.DataFrame(records)
    return df[df["Topic"].isin(topics)]

def fetch_question_type_scores(kg_manager):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject)-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH sub.name AS Subject, q.type AS Type,
         COUNT(q) AS Total, SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS Correct
    RETURN Subject, Type, Total, Correct
    """
    records = kg_manager.run_query(query)
    return pd.DataFrame(records)

def fetch_wrong_questions_by_qtype(kg_manager, subject, types):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE q.type IN $types AND q.isCorrect = false
    RETURN t.name AS TestName, q.type AS Type, st.name AS Subtopic,
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
           q.text AS QuestionText, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
    """
    records = kg_manager.run_query(query, subject=subject, types=types)
    df = pd.DataFrame(records)
    if "Type" not in df.columns:
        return df
    else:
        return df[df["Type"].isin(types)]

def fetch_correct_questions_by_qtype(kg_manager, subject, types):
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject {name: $subject})-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(st:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    WHERE q.type IN $types AND q.isCorrect = true
    RETURN t.name AS TestName, q.type AS Type, st.name AS Subtopic,
           q.number AS QuestionNumber, q.optedAnswer AS OptedAnswer,
           q.text AS QuestionText, q.imdesp AS ImgDesc,
           f.text AS Feedback, m.type AS MisType, m.description AS MisDesc
    """
    records = kg_manager.run_query(query, subject=subject, types=types)
    df = pd.DataFrame(records)
    if "Type" not in df.columns:
        return df
    else:
        return df[df["Type"].isin(types)]

# --------------------- Analysis Functions ---------------------
# Each metric function returns a dictionary mapping subject names to lists of processed records.

def best_topics(kg_manager):
    #("Running Best Topics Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    best_topics_df = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=False)\
                                     .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in best_topics_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_correct_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def improvement_over_time(kg_manager):
    #("Running Improvement Over Time Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    improvement_df = df_topic_metrics.sort_values(by=["ImprovementRate", "WeightedScore"], ascending=False)\
                                     .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in improvement_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_correct_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def strongest_question_type(kg_manager):
    #("Running Strongest Question Type Analysis...")
    df_qtypes = fetch_question_type_scores(kg_manager)
    df_qtypes["WeightedScore"] = df_qtypes.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    top_qtypes = df_qtypes.sort_values(by="WeightedScore", ascending=False)\
                           .groupby("Subject").head(3)
    subject_data = {}
    for subject, group in top_qtypes.groupby("Subject"):
        types = group["Type"].tolist()
        df = fetch_correct_questions_by_qtype(kg_manager, subject, types)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def most_challenging_topics(kg_manager):
    #("Running Most Challenging Topics Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    challenging_df = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=True)\
                                     .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in challenging_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_wrong_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def weakness_over_time(kg_manager):
    #("Running Weakness Over Time Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    bottom_topics_df = df_topic_metrics.sort_values(by=["ImprovementRate", "WeightedScore"], ascending=True)\
                                       .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in bottom_topics_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_wrong_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def low_retention_topics(kg_manager):
    #("Running Low Retention Topics Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    df_scores["Accuracy"] = df_scores["Correct"] / df_scores["Total"]
    df_scores["TotalQuestions"] = df_scores["Total"]
    topic_metrics = []
    for (subject, topic), group in df_scores.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        weighted_score = group["WeightedScore"].mean()
        accuracy = group["Accuracy"].mean()
        total_questions = group["TotalQuestions"].sum()
        topic_metrics.append({
            "Subject": subject,
            "Topic": topic,
            "WeightedScore": weighted_score,
            "ImprovementRate": improvement_rate,
            "Accuracy": accuracy,
            "TotalQuestions": total_questions
        })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    retention_filtered = df_topic_metrics[(df_topic_metrics["ImprovementRate"] >= 0.0) & 
                                          (df_topic_metrics["ImprovementRate"] <= 0.9)]
    low_retention_df = retention_filtered.sort_values(by=["Accuracy", "TotalQuestions"], ascending=[True, False])\
                                         .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in low_retention_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_wrong_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def practice_recommendation(kg_manager):
    #("Running Practice Recommendation Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    # Helper function to select the middle 10 rows of each subject group.
    def select_middle_10(df):
        sorted_df = df.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=True).reset_index(drop=True)
        total_rows = len(sorted_df)
        if total_rows <= 10:
            return sorted_df
        mid = total_rows // 2
        start = max(0, mid - 5)
        end = min(total_rows, mid + 5)
        return sorted_df.iloc[start:end]
    # Use groupby apply then reset the grouping index without re-inserting 'Subject'
    practice_df = df_topic_metrics.groupby("Subject").apply(lambda x: select_middle_10(x)).reset_index(level=0, drop=True)
    # Since the 'Subject' column is already present in df_topic_metrics, no further reset is needed.
    subject_data = {}
    for subject, group in practice_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def missed_opportunities(kg_manager):
    #("Running Missed Opportunities Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    missed_df = df_topic_metrics.sort_values(by=["WeightedScore", "ImprovementRate"], ascending=[False, True])\
                                  .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in missed_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def rapid_learning(kg_manager):
    #("Running Rapid Learning Topics Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
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
    rapid_df = df_topic_metrics.sort_values(by="ImprovementRate", ascending=False)\
                                .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in rapid_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def recurring_mistake_conceptual_gap(kg_manager):
    #("Running Recurring Mistake & Conceptual Gap Analysis...")
    df_qtypes = fetch_question_type_scores(kg_manager)
    df_qtypes["WeightedScore"] = df_qtypes.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    bottom_qtypes = df_qtypes.sort_values(by="WeightedScore", ascending=True)\
                              .groupby("Subject").head(3)
    subject_data = {}
    for subject, group in bottom_qtypes.groupby("Subject"):
        types = group["Type"].tolist()
        df = fetch_wrong_questions_by_qtype(kg_manager, subject, types)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def weakness_on_high_impact(kg_manager):
    #("Running Weakness on High Impact Topic Analysis...")
    df_scores = fetch_topic_scores(kg_manager)
    df_scores["WeightedScore"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    df_scores["Accuracy"] = df_scores["Correct"] / df_scores["Total"]
    df_scores["TotalQuestions"] = df_scores["Total"]
    topic_metrics = []
    for (subject, topic), group in df_scores.groupby(["Subject", "Topic"]):
        group_sorted = group.sort_values("TestName")
        improvement_rate = calculate_improvement_rate(group_sorted["Correct"].tolist())
        weighted_score = group["WeightedScore"].mean()
        accuracy = group["Accuracy"].mean()
        total_questions = group["TotalQuestions"].sum()
        topic_metrics.append({
            "Subject": subject,
            "Topic": topic,
            "WeightedScore": weighted_score,
            "ImprovementRate": improvement_rate,
            "Accuracy": accuracy,
            "TotalQuestions": total_questions
        })
    df_topic_metrics = pd.DataFrame(topic_metrics)
    high_impact_df = df_topic_metrics.sort_values(by=["TotalQuestions", "Accuracy"], ascending=[False, True])\
                                     .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in high_impact_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data

def inconsistent_performance(kg_manager):
    #("Running Inconsistent Performance Analysis...")
    query = """
    MATCH (t:Test)-[:CONTAINS]->(sub:Subject)-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH t.name AS TestName, sub.name AS Subject, tp.name AS Topic,
         COUNT(q) AS Total, SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS Correct
    RETURN TestName, Subject, Topic, Total, Correct
    """
    records = kg_manager.run_query(query)
    df_scores = pd.DataFrame(records)
    df_scores["WeightedAccuracy"] = df_scores.apply(lambda row: calculate_weighted_score(row["Total"], row["Correct"]), axis=1)
    std_df = df_scores.groupby(["Subject", "Topic"])["WeightedAccuracy"].agg(["mean", "std"]).reset_index()\
                     .rename(columns={"std": "StdDev", "mean": "MeanWeightedAccuracy"})
    inconsistent_df = std_df.sort_values(by="StdDev", ascending=False)\
                              .groupby("Subject").head(10)
    subject_data = {}
    for subject, group in inconsistent_df.groupby("Subject"):
        topics = group["Topic"].tolist()
        df = fetch_all_questions(kg_manager, subject, topics)
        subject_data[subject] = df.to_dict(orient='records')
    return subject_data
