from exam.models.analysis import QuestionAnalysis
from django.db import transaction


def save_analysis(result, class_id, test_num ):
    with transaction.atomic():  # Ensure atomic database transactions
            for question_data in result:
                QuestionAnalysis.objects.update_or_create(
                    class_id=class_id,
                    test_num=test_num,
                    question_number=question_data.get("question_number"),
                    defaults={
                        "subject": question_data.get("Subject"),
                        "chapter": question_data.get("Chapter"),
                        "topic": question_data.get("Topic"),
                        "subtopic": question_data.get("Subtopic"),
                        "typeOfquestion": question_data.get("TypeOfQuestion", "NA"),
                        "question_text":  question_data.get("question_text"),
                        "im_desp": question_data.get("im_desp"),
                        "option_1": question_data.get("option_1"),
                        "option_2": question_data.get("option_2"),
                        "option_3": question_data.get("option_3"),
                        "option_4": question_data.get("option_4"),
                        "correct_answer": question_data.get("CorrectAnswer"),
                        "option_1_feedback": question_data.get("Feedback1", ""),
                        "option_2_feedback": question_data.get("Feedback2", ""),
                        "option_3_feedback": question_data.get("Feedback3", ""),
                        "option_4_feedback": question_data.get("Feedback4", ""),
                        "option_1_type": question_data.get("Error_Type1", ""),
                        "option_2_type": question_data.get("Error_Type2", ""),
                        "option_3_type": question_data.get("Error_Type3", ""),
                        "option_4_type": question_data.get("Error_Type4", ""),
                        "option_1_misconception": question_data.get("Error_Desp1", ""),
                        "option_2_misconception": question_data.get("Error_Desp2", ""),
                        "option_3_misconception": question_data.get("Error_Desp3", ""),
                        "option_4_misconception": question_data.get("Error_Desp4", ""),
                    }
                )