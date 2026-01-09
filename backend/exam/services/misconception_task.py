"""
Celery task for inferring student misconceptions on wrong answers.

This task runs asynchronously after per-student analysis is complete.
It fetches all wrong-but-attempted questions for the student+test,
sends them to the LLM in one batch call, and updates the misconception field.
"""
import logging
from celery import shared_task
from django.db import transaction
from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis
from exam.llm_call.misconception_inference import infer_misconceptions_batch

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def infer_student_misconceptions(self, student_id: str, class_id: str, test_num: int):
    """
    Infer misconceptions for all wrong answers by a student in a test.
    
    Steps:
    1. Query StudentResult for attempted but incorrect answers
    2. Fetch full question data from QuestionAnalysis
    3. Call LLM once with all wrong questions
    4. Parse JSON response and update StudentResult.misconception for each question
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    """
    try:
        logger.info(f"🔍 Starting misconception inference for student={student_id}, class={class_id}, test={test_num}")
        
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
        
        logger.info(f"📋 Found {wrong_results.count()} wrong answers to analyze")
        
        # Step 2: Build question data for LLM
        questions_data = []
        question_num_to_result = {}  # Map for quick lookup during update
        
        for result in wrong_results:
            try:
                # Fetch full question analysis data
                qa = QuestionAnalysis.objects.get(
                    class_id=class_id,
                    test_num=test_num,
                    question_number=result.question_number
                )
                
                # Get student's responses to find opted answer
                from exam.models.response import StudentResponse
                response = StudentResponse.objects.filter(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=test_num,
                    question_number=result.question_number
                ).first()
                
                if not response or not response.selected_answer:
                    logger.warning(f"⚠️ No response found for Q{result.question_number}, skipping")
                    continue
                
                # Map selected answer index to actual option text
                selected_idx = response.selected_answer
                if selected_idx in ['1', '2', '3', '4']:
                    opted_text = getattr(qa, f"option_{selected_idx}", "Unknown")
                else:
                    opted_text = "Unknown"
                
                question_data = {
                    'question_number': result.question_number,
                    'subject': qa.subject,
                    'chapter': qa.chapter,
                    'topic': qa.topic,
                    'question_text': qa.question_text,
                    'im_desp': getattr(qa, 'im_desp', ''),
                    'option_1': qa.option_1,
                    'option_2': qa.option_2,
                    'option_3': qa.option_3,
                    'option_4': qa.option_4,
                    'correct_answer': qa.correct_answer,
                    'opted_answer': opted_text
                }
                
                questions_data.append(question_data)
                question_num_to_result[result.question_number] = result
                
            except QuestionAnalysis.DoesNotExist:
                logger.warning(f"⚠️ QuestionAnalysis not found for Q{result.question_number}")
                continue
            except Exception as e:
                logger.error(f"❌ Error preparing Q{result.question_number}: {e}")
                continue
        
        if not questions_data:
            logger.warning(f"⚠️ No valid question data to send to LLM for student {student_id}")
            return
        
        # Step 3: Call LLM with batch of questions
        logger.info(f"🤖 Sending {len(questions_data)} questions to Gemini 2.5 Flash")
        misconceptions = infer_misconceptions_batch(questions_data)
        
        if not misconceptions:
            logger.warning(f"⚠️ LLM returned no misconceptions for student {student_id}")
            return
        
        # Step 4: Update StudentResult records with misconceptions (stored as JSON)
        updated_count = 0
        with transaction.atomic():
            for question_num, misconception_data in misconceptions.items():
                if question_num in question_num_to_result:
                    result = question_num_to_result[question_num]
                    # Store as JSON string: {"type": "...", "text": "..."}
                    import json
                    result.misconception = json.dumps(misconception_data, ensure_ascii=False)
                    result.save(update_fields=['misconception'])
                    updated_count += 1
                    logger.debug(f"✅ Updated misconception for Q{question_num}: {misconception_data['type']} - {misconception_data['text'][:50]}...")
        
        logger.info(f"✅ Successfully updated {updated_count}/{len(questions_data)} misconceptions for student {student_id}, test {test_num}")
        
    except Exception as e:
        logger.error(f"❌ Error in misconception inference task for student {student_id}: {e}", exc_info=True)
        # Retry the task up to max_retries times
        raise self.retry(exc=e)
