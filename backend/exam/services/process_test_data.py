from exam.utils.csv_processing import get_answer_dict, get_student_response, get_subject_from_answer_key
from exam.utils.pdf_processing import questions_extract, get_subject_from_q_paper, questions_extract_with_metadata
from exam.ingestions.populate_question import save_questions_bulk 
from exam.ingestions.populate_response import save_student_response
from exam.utils.question_analysis import analyse_questions 
from exam.utils.student_analysis import analyse_students
from exam.services.update_dashboard import update_student_dashboard, update_educator_dashboard
from celery import shared_task
from django.utils.timezone import now
from exam.models.test_status import TestProcessingStatus
from exam.models.test_metadata import TestMetadata
import logging
import sentry_sdk
import time
from exam.models.educator import Educator

logger = logging.getLogger(__name__)

def get_answer_dict_with_retry(path, max_retries=5, delay=0.5):
    """
    Retry wrapper for get_answer_dict to handle S3 eventual consistency issues.
    Returns answer_dict or raises Exception after retries exhausted.
    """
    for attempt in range(1, max_retries + 1):
        answer_dict = get_answer_dict(path)
        if answer_dict:
            logger.info(f"✅ Successfully loaded answer key from {path} on attempt {attempt}")
            return answer_dict
        logger.warning(f"⚠️ Attempt {attempt}/{max_retries}: Answer key empty or not found at {path}, retrying in {delay}s...")
        if attempt < max_retries:
            time.sleep(delay)
    
    error_msg = f"❌ Failed to load answer key after {max_retries} attempts: {path}"
    logger.error(error_msg)
    raise Exception(error_msg)

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

        # Check if test metadata exists (admin-provided subject mapping)
        metadata = TestMetadata.objects.filter(class_id=class_id, test_num=test_num).first()
        
        # Use retry wrapper for answer_dict to handle S3 timing issues
        answer_dict = get_answer_dict_with_retry(answer_key_path, max_retries=6, delay=0.5)
        logger.info(f"📋 Loaded {len(answer_dict)} answers from answer key")
        
        response_dict = get_student_response(answer_sheet_path, class_id)
        save_student_response(class_id, test_num, response_dict)

        if metadata:
            # Use admin-provided metadata for subject mapping
            logger.info(f"✅ Using admin-provided metadata for test {test_num}")
            status_obj.logs += f"\n✅ Using metadata: {metadata.pattern} with {metadata.total_questions} questions"
            status_obj.save()
            
            subject_ranges = metadata.get_subject_ranges()
            logger.info(f"📊 Subject ranges: {subject_ranges}")
            
            # Extract questions using metadata
            questions_list = questions_extract_with_metadata(
                question_paper_path, 
                test_path, 
                subject_ranges,
                metadata.total_questions
            )
            
            if questions_list:
                save_questions_bulk(class_id, test_num, questions_list, answer_dict)
                
                # Analyze all subjects at once - analyse_questions will discover subjects from QuestionPaper
                logger.info(f"🔍 Analyzing all subjects...")
                analyse_questions(class_id, test_num, subject=None)
                
                # Analyze students ONCE after all subjects are analyzed
                logger.info(f"🔍 Analyzing students for all subjects...")
                analyse_students(class_id, test_num, subject=None)
            else:
                logger.warning("⚠️ Metadata extraction failed, falling back to automatic detection")
                status_obj.logs += "\n⚠️ Metadata extraction failed, using fallback"
                status_obj.save()
                raise Exception("Metadata extraction returned empty questions list")
                
        else:
            # Fallback: automatic subject detection (original behavior)
            logger.info(f"ℹ️ No metadata found, using automatic subject detection")
            status_obj.logs += "\nℹ️ Using automatic subject detection (fallback)"
            status_obj.save()
            
            subject = get_subject(class_id, answer_key_path, question_paper_path)
            questions_list = questions_extract(question_paper_path, test_path)
            if not questions_list:
                logger.warning("⚠️ Automatic extraction failed: no questions returned")
                status_obj.logs += "\n⚠️ Automatic extraction failed: no questions returned"
                status_obj.save()
                raise Exception("Automatic extraction returned empty questions list")

            for q in questions_list:
                q['subject'] = subject
            save_questions_bulk(class_id, test_num, questions_list, answer_dict)
            analyse_questions(class_id, test_num, subject)
            analyse_students(class_id, test_num, subject)

        # NOTE: update_student_dashboard is now called automatically via chord callback
        # after all student analysis tasks complete (see student_analysis.py)
        # update_educator_dashboard will be triggered automatically after update_student_dashboard completes
        logger.info(f"📊 Student & educator dashboards will be updated after all student analysis tasks complete.")
        
        # Do NOT mark final success here; final success will be set by the educator dashboard
        status_obj.logs += "\n✅ Processing completed (analysis & scheduling finished)"
        status_obj.save()

        logger.info(f"✅ Test {test_num} processed and analysis scheduled for class {class_id}")

    except Exception as e:
        logger.exception(f"❌ Error processing test {test_num} for class {class_id}: {e}")
        status_obj.status = "failed"
        status_obj.logs += f"\n❌ Failed with error: {e}"
        status_obj.ended_at = now()
        status_obj.save()
        raise e