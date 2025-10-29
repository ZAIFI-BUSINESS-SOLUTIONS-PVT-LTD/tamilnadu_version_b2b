from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager

def get_overview_data(db_name):
    kg_manager = KnowledgeGraphManager(database_name=db_name)

    performance_graph = fetch_chapter_topic_graph(kg_manager)
    performance_data = fetch_full_chapter_topic_data(kg_manager)

    kg_manager.close()

    return performance_graph, performance_data



def fetch_chapter_topic_graph(kg_manager):
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

    chapter_query = """
    MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(ch:CHAPTER)
          -[:CONTAINS]->(:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH s.name AS SubjectName, ch.name AS ChapterName, t.name AS TestName,
         COUNT(q) AS TotalQuestions,
         SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS CorrectAnswers
    RETURN SubjectName, ChapterName, TestName,
           ROUND(100.0 * CorrectAnswers / TotalQuestions, 2) AS AccuracyPercent
    ORDER BY SubjectName, ChapterName, TestName
    """

    topic_query = """
    MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(ch:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    WHERE q.optedAnswer IS NOT NULL
    WITH s.name AS SubjectName, ch.name AS ChapterName, tp.name AS TopicName, t.name AS TestName,
         COUNT(q) AS TotalQuestions,
         SUM(CASE WHEN q.isCorrect = true THEN 1 ELSE 0 END) AS CorrectAnswers
    RETURN SubjectName, ChapterName, TopicName, TestName,
           ROUND(100.0 * CorrectAnswers / TotalQuestions, 2) AS AccuracyPercent
    ORDER BY SubjectName, ChapterName, TopicName, TestName
    """

    with kg_manager.get_session() as session:
        # Step 1: Chapter-level
        chapter_result = session.run(chapter_query)
        hierarchy = {}

        for record in chapter_result:
            subject = record["SubjectName"]
            chapter = record["ChapterName"]
            test = record["TestName"]
            accuracy = float(record["AccuracyPercent"])

            hierarchy.setdefault(subject, {})
            hierarchy[subject].setdefault(chapter, {
                "chapter_accuracy": {},
                "topics": {}
            })
            hierarchy[subject][chapter]["chapter_accuracy"][test] = accuracy

        warnings = chapter_result.consume()

        # Step 2: Topic-level
        topic_result = session.run(topic_query)

        for record in topic_result:
            subject = record["SubjectName"]
            chapter = record["ChapterName"]
            topic = record["TopicName"]
            test = record["TestName"]
            accuracy = float(record["AccuracyPercent"])

            if subject not in hierarchy or chapter not in hierarchy[subject]:
                continue

            hierarchy[subject][chapter]["topics"].setdefault(topic, {})
            hierarchy[subject][chapter]["topics"][topic][test] = accuracy
            
        warnings = topic_result.consume()

    return hierarchy


def fetch_full_chapter_topic_data(kg_manager):
    """
    Fetches subject → chapter → topic → list of feedback comments.
    Returns JSON string compatible with frontend.
    """
    query = """
    MATCH (t:Test)-[:CONTAINS]->(s:Subject)-[:CONTAINS]->(ch:CHAPTER)
          -[:CONTAINS]->(tp:Topic)-[:CONTAINS]->(:Subtopic)-[:CONTAINS]->(q:Question)
    OPTIONAL MATCH (q)-[:HAS_FEEDBACK]->(f:Feedback)
    RETURN s.name AS SubjectName,
           ch.name AS ChapterName,
           tp.name AS TopicName,
           f.text AS FeedbackText
    ORDER BY SubjectName, ChapterName, TopicName
    """

    subject_map = {}

    with kg_manager.get_session() as session:
        result = session.run(query)

        for record in result:
            subject = record["SubjectName"]
            chapter = record["ChapterName"]
            topic = record["TopicName"]
            feedback = record["FeedbackText"]

            if feedback:
                subject_map \
                    .setdefault(subject, {}) \
                    .setdefault(chapter, {}) \
                    .setdefault(topic, []) \
                    .append(feedback)

    # Convert to JSON string for frontend
    return subject_map
