from exam.utils.csv_processing import get_answer_dict, get_student_response, get_subject_from_answer_key
from exam.utils.pdf_processing import questions_extract, get_subject_from_q_paper
from exam.ingestions.populate_question import save_questions_bulk 
from exam.ingestions.populate_response import save_student_response
from exam.utils.question_analysis import analyse_questions 
from exam.utils.student_analysis import analyse_students
from exam.services.update_dashboard import update_student_dashboard, update_educator_dashboard
from celery import shared_task
from django.utils.timezone import now
from exam.models.test_status import TestProcessingStatus
import logging
from exam.models.educator import Educator
from exam.utils.subject_classification import classify_biology_questions

logger = logging.getLogger(__name__)

def get_subject(class_id, answer_key_path, question_paper_path):
    class_id_lower = class_id.lower()
    if "biology" in class_id_lower:
        return "Biology"
    if "botany" in class_id_lower:
        return "Botany"
    if "zoology" in class_id_lower:
        return "Zoology"

    subject = get_subject_from_answer_key(answer_key_path)
    if subject:
        return subject

    return get_subject_from_q_paper(question_paper_path)

@shared_task
def process_test_data(class_id, test_num):
    """Processes test data asynchronously after files are saved."""

    test_path = f"inzighted/uploads/{class_id}/TEST_{test_num}/"

    question_paper_path = f"{test_path}qp.pdf"
    answer_key_path = f"{test_path}ans"
    answer_sheet_path = f"{test_path}resp"

    try:
        status_obj, _ = TestProcessingStatus.objects.get_or_create(
            class_id=class_id, test_num=test_num,
            defaults={"status": "PROCESSING", "started_at": now()}
        )
        status_obj.status = "Processing"
        status_obj.logs = "Started processing"
        status_obj.started_at = now()
        status_obj.save()
        
        logger.info(f"🚀 Processing test {test_num} for class {class_id}...")

        try:
            educator = Educator.objects.get(class_id=class_id)
            should_split_biology = educator.separate_biology_subjects
        except Educator.DoesNotExist:
            should_split_biology = False

        subject = get_subject(class_id, answer_key_path, question_paper_path)
        answer_dict = get_answer_dict(answer_key_path)
        response_dict = get_student_response(answer_sheet_path, class_id)
        save_student_response(class_id, test_num, response_dict)

        if subject == "Biology" and should_split_biology:
            questions_list = questions_extract(question_paper_path, test_path)
            classified_questions = classify_biology_questions(questions_list)
            save_questions_bulk(class_id, test_num, classified_questions, answer_dict)

            for sub in ["Botany", "Zoology"]:
                analyse_questions(class_id, test_num, sub)
                analyse_students(class_id, test_num, sub)
        else:
            questions_list = questions_extract(question_paper_path, test_path)
            for q in questions_list:
                q['subject'] = subject
            save_questions_bulk(class_id, test_num, questions_list, answer_dict)
            analyse_questions(class_id, test_num, subject)
            analyse_students(class_id, test_num, subject)

        update_student_dashboard(class_id, test_num)
        update_educator_dashboard(class_id, test_num)
        
        status_obj.status = "Successful"
        status_obj.logs += "\n✅ Processing completed"
        status_obj.ended_at = now()
        status_obj.save()

        logger.info(f"✅ Test {test_num} processed successfully for class {class_id}")

    except Exception as e:
        logger.error(f"❌ Error processing test {test_num} for class {class_id}: {e}")
        status_obj.status = "failed"
        status_obj.logs += f"\n❌ Failed with error: {e}"
        status_obj.ended_at = now()
        status_obj.save()
        raise e