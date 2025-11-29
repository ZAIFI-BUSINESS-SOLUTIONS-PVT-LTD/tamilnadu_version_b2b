from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager
import pandas as pd
import numpy as np


def get_overview_data(db_name):
    kg_manager = KnowledgeGraphManager(database_name=db_name)

    KS_data = get_key_strength_data(kg_manager)
    AI_data = get_area_for_improvement_data(kg_manager)
    QR_data = AI_data  # Assuming Quick Revision = Improvement Questions
    CV_data = get_consistency_vulnerability_data(kg_manager)
    PT = get_performance_trend_graph(kg_manager)
    SA = get_test_wise_subject_score(kg_manager)

    kg_manager.close()

    return KS_data, AI_data, QR_data, CV_data, PT, SA


def get_key_strength_data(kg_manager):
    # Top chapters query
    top_chapter_query = """
    MATCH (s:Subject)-[:CONTAINS]->(c:CHAPTER)-[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WITH 
      s.name AS subject, 
      c.name AS chapter, 
      COUNT(q) AS totalQuestions, 
      SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS correctQuestions
    WITH 
      subject,
      chapter,
      ((1.0 * correctQuestions) / totalQuestions) * log10(totalQuestions + 1) AS weightedScore
    ORDER BY subject, weightedScore DESC
    WITH subject, collect(chapter)[..5] AS topChapters
    RETURN subject, topChapters
    """

    with kg_manager.get_session() as session:
        top_chapter_result = session.run(top_chapter_query)
        
        subject_to_top_chapters = {
            record["subject"]: record["topChapters"]
            for record in top_chapter_result
        }
        warnings = top_chapter_result.consume()

    # Get question metadata for those chapters
    correct_questions_query = """
    UNWIND $subject_chapter_pairs AS sc
    MATCH (s:Subject {name: sc.subject})-[:CONTAINS]->(c:CHAPTER {name: sc.chapter})
    MATCH (c)-[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question {isCorrect: true})
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    RETURN sc.subject AS subject, sc.chapter AS chapter, 
           q.number AS n, q.text AS txt, q.type AS type, q.optedAnswer AS ans,
           q.imdesp AS img, f.text AS fb, m.type AS err
    """

    subject_chapter_pairs = [
        {"subject": subject, "chapter": chapter}
        for subject, chapters in subject_to_top_chapters.items()
        for chapter in chapters
    ]

    with kg_manager.get_session() as session:
        result = session.run(correct_questions_query, subject_chapter_pairs=subject_chapter_pairs)
        structured = {}
        for record in result:
            subj = record["subject"]
            chap = record["chapter"]
            q = {
                "n": record["n"],
                "txt": record["txt"],
                "type": record["type"],
                "ans": record["ans"],
                "img": record["img"],
                "fb": record["fb"],
                "err": record["err"]
            }
            structured.setdefault(subj, {}).setdefault(chap, []).append(q)
        warnings = result.consume()

    result = {"subjects": []}
    for subject, chapters in subject_to_top_chapters.items():
        sub_entry = {"name": subject, "top_chapters": []}
        for chapter in chapters:
            qlist = structured.get(subject, {}).get(chapter, [])
            sub_entry["top_chapters"].append({"name": chapter, "questions": qlist})
        result["subjects"].append(sub_entry)

    return result


def get_area_for_improvement_data(kg_manager):
    chapter_query = """
    MATCH (s:Subject)-[:CONTAINS]->(c:CHAPTER)-[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WITH 
      s.name AS subject, 
      c.name AS chapter, 
      COUNT(q) AS totalQuestions, 
      SUM(CASE WHEN q.isCorrect IS NOT NULL AND q.isCorrect = true THEN 1 ELSE 0 END) AS correctQuestions
    WITH 
      subject,
      chapter,
      ((1.0 * correctQuestions) / totalQuestions) * log10(totalQuestions + 1) AS weightedScore
    ORDER BY subject, weightedScore DESC
    WITH subject, collect({chapter: chapter, score: weightedScore}) AS scoredChapters
    WITH subject, scoredChapters,
         size(scoredChapters) AS total,
         toInteger(size(scoredChapters) / 2) AS mid
    WITH subject,
         (CASE WHEN mid < 5 THEN 0 ELSE mid - 5 END) AS start,
         (CASE WHEN mid + 5 > total THEN total ELSE mid + 5 END) AS end,
         scoredChapters
    WITH subject, scoredChapters[start..end] AS midChapters
    UNWIND midChapters AS ch
    RETURN subject, collect(ch.chapter) AS improvementChapters
    """

    with kg_manager.get_session() as session:
        result = session.run(chapter_query)
        subject_to_chapters = {
            record["subject"]: record["improvementChapters"]
            for record in result
        }
        warnings = result.consume()

    question_query = """
    UNWIND $chapter_pairs AS sc
    MATCH (s:Subject {name: sc.subject})-[:CONTAINS]->(c:CHAPTER {name: sc.chapter})
    MATCH (c)-[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question {isCorrect: true})
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)

    RETURN sc.subject AS subject, sc.chapter AS chapter, 
           q.number AS n, q.text AS txt, q.type AS type, q.optedAnswer AS ans,
           q.imdesp AS img, f.text AS fb, m.type AS err
    """

    chapter_pairs = [
        {"subject": subject, "chapter": chapter}
        for subject, chapters in subject_to_chapters.items()
        for chapter in chapters
    ]

    with kg_manager.get_session() as session:
        result = session.run(question_query, chapter_pairs=chapter_pairs)
        structured = {}
        for record in result:
            subj = record["subject"]
            chap = record["chapter"]
            q = {
                "n": record["n"],
                "txt": record["txt"],
                "type": record["type"],
                "ans": record["ans"],
                "img": record["img"],
                "fb": record["fb"],
                "err": record["err"]
            }
            structured.setdefault(subj, {}).setdefault(chap, []).append(q)
        warnings = result.consume()

    response = {"subjects": []}
    for subject, chapters in subject_to_chapters.items():
        subj_data = {"name": subject, "chapters": []}
        for chapter in chapters:
            qlist = structured.get(subject, {}).get(chapter, [])
            subj_data["chapters"].append({"name": chapter, "questions": qlist})
        response["subjects"].append(subj_data)

    return response


def get_consistency_vulnerability_data(kg_manager):
    accuracy_query = """
    MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(c:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH t.name AS test_name, s.name AS subject, c.name AS chapter,
         COUNT(q) AS total_questions,
         SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS correct_questions
    RETURN test_name, subject, chapter,
           1.0 * correct_questions / total_questions AS accuracy
    ORDER BY subject, chapter, test_name
    """

    with kg_manager.get_session() as session:
        result = session.run(accuracy_query)
        
        accuracy_df = pd.DataFrame([record.data() for record in result])
        warnings = result.consume()

    question_query = """
    MATCH (:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(c:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    OPTIONAL MATCH (q)-[:HAS_MISCONCEPTION]->(m:Misconception)
    RETURN s.name AS subject, c.name AS chapter,
           q.number AS number, q.text AS text, q.type AS type,
           q.optedAnswer AS optedAnswer, q.imdesp AS img,
           COALESCE(f.text, "") AS fb,
           CASE WHEN m.type IS NOT NULL AND m.description IS NOT NULL
                THEN m.type + ": " + m.description
                ELSE "" END AS err
    """

    with kg_manager.get_session() as session:
        result = session.run(question_query)
        
        questions_df = pd.DataFrame([record.data() for record in result])
        warnings = result.consume()

    if accuracy_df.empty or questions_df.empty:
        return {}

    response = {"subjects": []}
    for subject, group in accuracy_df.groupby("subject"):
        chapter_scores = []
        for chapter, ch_group in group.groupby("chapter"):
            accuracies = ch_group["accuracy"].tolist()
            if len(accuracies) < 2:
                continue

            avg = np.mean(accuracies)
            std = np.std(accuracies)
            score = avg / (1 + std)

            chapter_scores.append({"name": chapter, "score": round(score, 4)})

        least_consistent = sorted(chapter_scores, key=lambda x: x["score"])[:5]
        subject_data = {"name": subject, "chapters": []}

        for ch in least_consistent:
            chapter_name = ch["name"]
            ch_questions_df = questions_df[
                (questions_df["subject"] == subject) &
                (questions_df["chapter"] == chapter_name)
            ]

            questions = ch_questions_df[[
                "number", "text", "type", "optedAnswer", "img", "fb", "err"
            ]].rename(columns={
                "number": "n", "text": "txt", "type": "type", "optedAnswer": "ans",
                "img": "img", "fb": "fb", "err": "err"
            }).to_dict(orient="records")

            subject_data["chapters"].append({
                "name": chapter_name,
                "score": ch["score"],
                "questions": questions
            })

        response["subjects"].append(subject_data)

    return response


def get_performance_trend_graph(kg_manager):
    """
    Returns a list of subject-wise test performance trends.
    Output:
    {
      "subjects": [
        {
          "name": "Physics",
          "tests": [65, 72, 40, 80]
        },
        ...
      ]
    }
    """
    cypher_query = """
    MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH s.name AS subject, t.name AS test,
         SUM(CASE 
               WHEN q.isCorrect = true THEN 4 
               WHEN q.isCorrect = false THEN -1 
               ELSE 0 
             END) AS score
    RETURN subject, test, score
    ORDER BY subject, test
    """

    with kg_manager.get_session() as session:
        result = session.run(cypher_query)
        
        records = [record.data() for record in result]
        warnings = result.consume()

    # Do not close kg_manager here — the top-level caller will close it.

    df = pd.DataFrame(records)
    if df.empty:
        return {"subjects": []}

    # Prepare subject-wise score lists ordered by test name
    df_sorted = df.sort_values(by=["subject", "test"])
    grouped = df_sorted.groupby("subject")["score"].apply(lambda x: list(x))

    output = {
        "subjects": [
            {"name": subject, "tests": scores}
            for subject, scores in grouped.items()
        ]
    }

    return output


def get_test_wise_subject_score(kg_manager):
    """
    Returns a test-wise subject score matrix:
    - Rows: Test Names
    - Columns: Subjects
    - Values: Total score (4/-1) per subject per test
    """

    # We keep the existing score aggregation but also compute counts:
    # - CorrectCount: sum of q.correct (or fallback to q.isCorrect)
    # - IncorrectPlusSkipped: sum of q.incorrect (or fallback to q.isCorrect=false)
    # - UnattemptedCount: count of q.optedAnswer IS NULL
    # The returned structure preserves the original subject -> Score columns and
    # adds additional columns per subject with suffixes:
    #   <Subject>__correct, <Subject>__incorrect, <Subject>__unattempted
    query = """
    MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(:CHAPTER)
        -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WITH t.name AS TestName, s.name AS SubjectName,
       SUM(CASE 
           WHEN q.isCorrect = true THEN 4 
           WHEN q.isCorrect = false AND q.optedAnswer IS NOT NULL THEN -1 
           ELSE 0 
         END) AS Score,
        SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS CorrectCount,
        SUM(CASE WHEN q.isCorrect = false AND q.optedAnswer IS NOT NULL THEN 1 ELSE 0 END) AS IncorrectCount,
        SUM(CASE WHEN q.optedAnswer IS NULL THEN 1 ELSE 0 END) AS UnattemptedCount
    RETURN TestName, SubjectName, Score, CorrectCount, IncorrectCount, UnattemptedCount
    ORDER BY TestName, SubjectName
    """

    with kg_manager.get_session() as session:
        result = session.run(query)
        # Don't inspect notifications
        records = [record.data() for record in result]
        warnings = result.consume()

    # Keep the driver open here; `get_overview_data` closes it after all parts
    # have been generated.

    if not records:
        return []

    df = pd.DataFrame(records)

    # Pivot with multiple value columns (Score and counts). Use pivot_table to be
    # defensive against unexpected duplicate (TestName, SubjectName) rows.
    pivot = df.pivot_table(
        index="TestName",
        columns="SubjectName",
        values=["Score", "CorrectCount", "IncorrectCount", "UnattemptedCount"],
        aggfunc="sum",
        fill_value=0,
    )

    # Collect subjects in a stable order
    subjects = sorted(df["SubjectName"].unique())

    # Build a flattened DataFrame that preserves original Score columns and
    # appends per-subject count columns with suffixes.
    out_df = pd.DataFrame(index=pivot.index)
    out_df["Test"] = pivot.index

    def _series(metric, subject):
        try:
            return pivot[(metric, subject)]
        except Exception:
            return pd.Series(0, index=pivot.index)

    for subj in subjects:
        score_s = _series("Score", subj).astype(float).fillna(0)
        correct_s = _series("CorrectCount", subj).fillna(0)
        incorrect_s = _series("IncorrectCount", subj).fillna(0)
        unattempted_s = _series("UnattemptedCount", subj).fillna(0)

        # Keep the original subject column name for Score (backwards compatible)
        out_df[subj] = score_s
        out_df[f"{subj}__correct"] = correct_s.astype(int)
        out_df[f"{subj}__incorrect"] = incorrect_s.astype(int)
        out_df[f"{subj}__unattempted"] = unattempted_s.astype(int)

    out_df = out_df.reset_index(drop=True)
    return out_df.to_dict(orient="records")