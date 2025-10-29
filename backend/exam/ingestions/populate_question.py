from exam.models.question_paper import QuestionPaper
from exam.models.test_status import TestProcessingStatus
import logging

logger = logging.getLogger(__name__)

def save_questions_bulk(class_id, test_num, questions, answer_dict):
    """Bulk insert questions for a specific class and test number."""
    status_obj, _ = TestProcessingStatus.objects.get_or_create(
            class_id=class_id, test_num=test_num
            
        )
    question_objects = []
    try:
        for q in questions:
            qnum = str(q.get("question_number"))
            options = q["options"]
            correct_index = answer_dict.get(str(qnum))

            correct_answer = options.get(str(correct_index))

            question_objects.append(
                QuestionPaper(
                    class_id=class_id,
                    test_num=test_num,
                    question_number=qnum,
                    subject=q.get('subject', 'Unknown'),
                    question_text=q["question"],
                    option_1=options.get("1"),
                    option_2=options.get("2"),
                    option_3=options.get("3"),
                    option_4=options.get("4"),
                    im_desp=q.get("im_desp") or None,  # ✅ Allow null if key missing or blank
                    correct_answer=correct_answer
                )
            )

        # ✅ Perform bulk insert
        QuestionPaper.objects.bulk_create(question_objects, batch_size=500)
        status_obj.status = "Successful"
        status_obj.logs += f"✅ Bulk inserted {len(question_objects)} questions for Class `{class_id}`, Test `{test_num}`"
        status_obj.save()
        logger.info(f"✅ Bulk inserted {len(question_objects)} questions for Class `{class_id}`, Test `{test_num}`")
        #print(f"✅ Bulk inserted {len(question_objects)} questions for Class `{class_id}`, Test `{test_num}`")
    except Exception as e:
        status_obj.status = "Failed"
        status_obj.logs += f"❌ Error during bulk insert: {e}"
        status_obj.save()
        logger.error(f"❌ Error during bulk insert: {e}")
        #print(f"❌ Error during bulk insert: {e}")
    