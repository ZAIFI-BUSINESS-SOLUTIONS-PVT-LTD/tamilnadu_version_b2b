"""
Celery task for generating and storing combined checkpoints (checklist + action plan).
Runs asynchronously during overview population.
"""
import logging
from celery import shared_task
from django.db import transaction
from exam.models.checkpoints import Checkpoints
from exam.insight.checkpoints_generator import generate_checkpoints_testwise

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def generate_and_save_checkpoints_testwise(self, student_id: str, class_id: str, test_num: int):
    """
    Generate combined checkpoints (checklist + action plan) and save to database.
    
    Steps:
    1. Call LLM with combined prompt to get paired insights
    2. Parse JSON response with 5 checkpoint items
    3. Save to Checkpoints table as JSON
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    """
    try:
        logger.info(f"🔍 Starting checkpoints generation for student={student_id}, class={class_id}, test={test_num}")
        
        # Generate checkpoints using LLM
        checkpoints = generate_checkpoints_testwise(student_id, class_id, test_num)
        
        if not checkpoints:
            logger.warning(f"⚠️ No checkpoints generated for student {student_id}, test {test_num}")
            return
        
        # Save to database
        with transaction.atomic():
            obj, created = Checkpoints.objects.update_or_create(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                defaults={'insights': checkpoints}
            )
            
            action = "Created" if created else "Updated"
            logger.info(f"✅ {action} {len(checkpoints)} checkpoints for student {student_id}, test {test_num}")
        
    except Exception as e:
        logger.error(f"❌ Error in checkpoints generation task for student {student_id}: {e}", exc_info=True)
        # Retry the task up to max_retries times
        raise self.retry(exc=e)
