# create_graph.py

from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager
import logging

logger = logging.getLogger(__name__)


def create_graph(student_id, db_name, student_analysis, test_name):
    test_name = f"Test{test_name}"
    
    kg_manager = KnowledgeGraphManager(database_name=db_name, create_if_missing=True)


    # did not work
    """if not kg_manager.check_db:
        kg_manager.create_db
        time.sleep(2)"""
    
    test_data = student_analysis.to_dict(orient="records")

    with kg_manager.get_session() as session:
        logger.info(f"Adding {test_name} for student {student_id}...")
        #print(f"Adding {test_name} for student {student_id}...")
        for question_data in test_data:
            subject = question_data.get("Subject", "Unknown Subject")
            chapter = question_data.get("Chapter", "Unknown Chapter")
            topic = question_data.get("Topic", "Unknown Topic")
            subtopic = question_data.get("Subtopic", "Unknown Subtopic")
            text = question_data.get("QuestionText", "No Text Provided")
            correct_answer = question_data.get("CorrectAnswer", "No Correct Answer")
            opted_answer = question_data.get("OptedAnswer", "Not Attempted")
            is_correct = question_data.get("IsCorrect", False)
            question_type = question_data.get("TypeOfQuestion", "Unknown Type")
            feedback = question_data.get("Feedback", "No Feedback Available")
            error_type = question_data.get("Error_Type", None)
            error_Desp = question_data.get("Error_Desp", None)
            number = question_data.get("QuestionNumber", 0)
            im_desp = question_data.get("im_desp", "")
            test_date = question_data.get("TestDate")

            session.run(
                """
                MERGE (test:Test {name: $test_name, date: $test_date })
                MERGE (subject:Subject {name: $subject, test_name: $test_name})
                MERGE (test)-[:CONTAINS]->(subject)
                MERGE (chapter:CHAPTER {name: $chapter, test_name: $test_name, subname: $subject})
                MERGE (subject)-[:CONTAINS]->(chapter)
                MERGE (topic:Topic {name: $topic, test_name: $test_name, chapname: $chapter, subname: $subject})
                MERGE (chapter)-[:CONTAINS]->(topic)
                MERGE (subtopic:Subtopic {name: $subtopic, test_name: $test_name, topicname: $topic, subname: $subject, chapname: $chapter})
                MERGE (topic)-[:CONTAINS]->(subtopic)
                MERGE (question:Question {
                    number: $number, test_name: $test_name
                })
                ON CREATE SET 
                    question.correctAnswer = $correct_answer,
                    question.optedAnswer = $opted_answer,
                    question.isCorrect = $is_correct,
                    question.type = $question_type,
                    question.imdesp = $im_desp,
                    question.text = $text
                ON MATCH SET
                    question.optedAnswer = $opted_answer,
                    question.isCorrect = $is_correct,
                    question.correctAnswer = $correct_answer,
                    question.type = $question_type
                MERGE (subtopic)-[:CONTAINS]->(question)
                """,
                test_name=test_name, subject=subject, chapter=chapter, topic=topic,
                subtopic=subtopic, text=text, correct_answer=correct_answer,
                opted_answer=opted_answer, is_correct=is_correct,
                question_type=question_type, number=number, im_desp=im_desp, test_date=test_date
            )

            if not is_correct and opted_answer:
                session.run(
                    """
                    MERGE (misconception:Misconception {type: $error_type, description: $error_desc, test_name: $test_name})
                    MERGE (question:Question {text: $text, test_name: $test_name})
                    MERGE (question)-[:HAS_MISCONCEPTION]->(misconception)
                    """,
                    error_type=error_type,
                    error_desc=error_Desp,
                    text=text, test_name=test_name
                )

            if opted_answer:
                session.run(
                    """
                    MERGE (feedback:Feedback {text: $feedback, test_name: $test_name})
                    MERGE (question:Question {text: $text, test_name: $test_name})
                    MERGE (question)-[:HAS_FEEDBACK]->(feedback)
                    """,
                    feedback=feedback,
                    text=text, test_name=test_name
                )

    kg_manager.close()
