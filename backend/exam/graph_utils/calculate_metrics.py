# summary_metrics.py

from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager
import pandas as pd
import numpy as np

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

