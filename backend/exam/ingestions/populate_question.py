from exam.models.question_paper import QuestionPaper
from exam.models.test_status import TestProcessingStatus
import logging
import sentry_sdk

logger = logging.getLogger(__name__)

def save_questions_bulk(class_id, test_num, questions, answer_dict):
    """Bulk insert questions for a specific class and test number."""
    status_obj, _ = TestProcessingStatus.objects.get_or_create(
            class_id=class_id, test_num=test_num
            
        )
    
    # ✅ Validate answer_dict before processing
    if not answer_dict:
        error_msg = f"❌ Answer dictionary is empty for class {class_id}, test {test_num}. Cannot process questions."
        logger.error(error_msg)
        status_obj.status = "Failed"
        status_obj.logs += f"\n{error_msg}"
        status_obj.save()
        raise ValueError(error_msg)
    
    # ✅ Build sets for validation
    question_numbers_in_qp = set()
    for q in questions:
        qnum_raw = q.get("question_number")
        if qnum_raw is not None:
            try:
                question_numbers_in_qp.add(str(int(qnum_raw)))
            except (ValueError, TypeError):
                logger.warning(f"⚠️ Invalid question_number format: {qnum_raw}, skipping")
    
    answer_keys = set(answer_dict.keys())
    
    # ✅ Compare sets and log differences
    missing_answers = question_numbers_in_qp - answer_keys
    extra_answers = answer_keys - question_numbers_in_qp
    
    if missing_answers:
        logger.error(f"❌ Questions missing answer keys: {sorted(missing_answers, key=lambda x: int(x))[:20]}")
    if extra_answers:
        logger.warning(f"⚠️ Answer keys without questions: {sorted(extra_answers, key=lambda x: int(x))[:20]}")
    
    logger.info(f"📊 Validation: {len(question_numbers_in_qp)} questions, {len(answer_keys)} answers, {len(missing_answers)} missing answers")
    
    question_objects = []
    skipped_count = 0
    
    try:
        for q in questions:
            qnum_raw = q.get("question_number")
            if qnum_raw is None:
                logger.warning(f"⚠️ Skipping question with null question_number: {q.get('question', '')[:50]}")
                skipped_count += 1
                continue
            
            try:
                qnum = int(qnum_raw)
            except (ValueError, TypeError):
                logger.warning(f"⚠️ Skipping question with invalid question_number: {qnum_raw}")
                skipped_count += 1
                continue
            
            qnum_str = str(qnum)
            options = q.get("options") or {}
            correct_index = answer_dict.get(qnum_str)

            correct_answer = None
            if correct_index is not None:
                # Normalize index and try lookup
                try:
                    correct_answer = options.get(str(int(correct_index)))
                except (ValueError, TypeError):
                    correct_answer = options.get(str(correct_index))
            
            if correct_answer is None:
                logger.error(
                    f"❌ Missing correct_answer for Q{qnum} (class={class_id}, test={test_num}, index={correct_index}). Skipping question."
                )
                skipped_count += 1
                continue

            question_objects.append(
                QuestionPaper(
                    class_id=class_id,
                    test_num=test_num,
                    question_number=qnum,
                    subject=q.get('subject', 'Unknown'),
                    question_text=q.get("question", ""),
                    option_1=options.get("1"),
                    option_2=options.get("2"),
                    option_3=options.get("3"),
                    option_4=options.get("4"),
                    im_desp=q.get("im_desp") or None,  # ✅ Allow null if key missing or blank
                    correct_answer=correct_answer
                )
            )

        # ✅ Perform bulk insert (ignore_conflicts to handle re-uploads)
        if not question_objects:
            error_msg = f"❌ No valid question objects to insert for class {class_id}, test {test_num}. All questions were skipped."
            logger.error(error_msg)
            status_obj.status = "Failed"
            status_obj.logs += f"\n{error_msg}"
            status_obj.save()
            raise ValueError(error_msg)
        
        QuestionPaper.objects.bulk_create(question_objects, batch_size=500, ignore_conflicts=True)
        status_obj.status = "Successful"
        
        summary = f"✅ Bulk inserted {len(question_objects)} questions for Class `{class_id}`, Test `{test_num}`"
        if skipped_count > 0:
            summary += f" ({skipped_count} questions skipped due to missing answers)"
        
        status_obj.logs += f"\n{summary}"
        status_obj.save()
        logger.info(summary)
        #print(f"✅ Bulk inserted {len(question_objects)} questions for Class `{class_id}`, Test `{test_num}`")
    except Exception as e:
        status_obj.status = "Failed"
        status_obj.logs += f"❌ Error during bulk insert: {e}"
        status_obj.save()
        logger.exception(f"❌ Error during bulk insert: {e}")
        #print(f"❌ Error during bulk insert: {e}")
    