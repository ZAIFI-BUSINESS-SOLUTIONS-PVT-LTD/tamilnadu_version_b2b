"""
Celery task for populating student misconceptions from QuestionAnalysis table.

This task runs asynchronously after per-student analysis is complete.
It fetches all wrong-but-attempted questions for the student+test,
retrieves pre-authored misconceptions from QuestionAnalysis (option_X_type, option_X_misconception),
and updates the StudentResult.misconception field.
"""
import logging
import json
from celery import shared_task
from django.db import transaction
from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis
from exam.models.response import StudentResponse

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def infer_student_misconceptions(self, student_id: str, class_id: str, test_num: int):
    """
    Populate misconceptions for all wrong answers by a student in a test using pre-authored data.
    
    Steps:
    1. Query StudentResult for attempted but incorrect answers
    2. For each wrong answer, find the student's selected option from StudentResponse
    3. Fetch corresponding option_X_type and option_X_misconception from QuestionAnalysis
    4. Update StudentResult.misconception with JSON: {"type": "...", "text": "..."}
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    """
    try:
        logger.info(f"🔍 Starting DB-driven misconception population for student={student_id}, class={class_id}, test={test_num}")
        
        # Step 1: Get all wrong (attempted but incorrect) questions
        wrong_results = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num,
            was_attempted=True,
            is_correct=False
        ).select_related()
        
        if not wrong_results.exists():
            logger.info(f"✅ No wrong answers found for student {student_id} in test {test_num}")
            return
        
        logger.info(f"📋 Found {wrong_results.count()} wrong answers to populate")
        
        # Step 2: Process each wrong answer
        updated_count = 0
        skipped_count = 0
        
        with transaction.atomic():
            for result in wrong_results:
                try:
                    # Fetch question analysis data
                    qa = QuestionAnalysis.objects.get(
                        class_id=class_id,
                        test_num=test_num,
                        question_number=result.question_number
                    )
                    
                    # Get student's selected answer
                    response = StudentResponse.objects.filter(
                        student_id=student_id,
                        class_id=class_id,
                        test_num=test_num,
                        question_number=result.question_number
                    ).first()
                    
                    if not response or not response.selected_answer:
                        logger.warning(f"⚠️ No response found for Q{result.question_number}, skipping")
                        skipped_count += 1
                        continue
                    
                    # Validate selected answer is in valid range
                    selected_idx = response.selected_answer
                    if selected_idx not in ['1', '2', '3', '4']:
                        logger.warning(f"⚠️ Invalid selected answer '{selected_idx}' for Q{result.question_number}, skipping")
                        skipped_count += 1
                        continue
                    
                    # Fetch pre-authored misconception data for the selected option
                    misconception_type = getattr(qa, f"option_{selected_idx}_type", None)
                    misconception_text = getattr(qa, f"option_{selected_idx}_misconception", None)
                    
                    # Only update if both type and text are available
                    if misconception_type and misconception_text:
                        misconception_data = {
                            'type': misconception_type.strip(),
                            'text': misconception_text.strip()
                        }
                        
                        # Store as JSON string in StudentResult
                        result.misconception = json.dumps(misconception_data, ensure_ascii=False)
                        result.save(update_fields=['misconception'])
                        updated_count += 1
                        
                        logger.debug(
                            f"✅ Updated Q{result.question_number} with misconception: "
                            f"{misconception_data['type']} - {misconception_data['text'][:50]}..."
                        )
                    else:
                        logger.debug(
                            f"⚠️ Missing misconception data for Q{result.question_number}, "
                            f"option {selected_idx} (type={misconception_type}, text={misconception_text})"
                        )
                        skipped_count += 1
                    
                except QuestionAnalysis.DoesNotExist:
                    logger.warning(f"⚠️ QuestionAnalysis not found for Q{result.question_number}")
                    skipped_count += 1
                    continue
                except Exception as e:
                    logger.error(f"❌ Error processing Q{result.question_number}: {e}")
                    skipped_count += 1
                    continue
        
        logger.info(
            f"✅ Misconception population complete for student {student_id}, test {test_num}: "
            f"{updated_count} updated, {skipped_count} skipped"
        )
        
    except Exception as e:
        logger.error(f"❌ Error in misconception population task for student {student_id}: {e}", exc_info=True)
        # Retry the task up to max_retries times
        raise self.retry(exc=e)
