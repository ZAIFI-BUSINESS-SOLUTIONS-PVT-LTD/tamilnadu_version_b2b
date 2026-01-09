"""
Celery task for generating and storing combined checkpoints (test-wise).

This task generates paired checklist + action plan insights in a single LLM call
and stores them in the Checkpoints table.
"""
import logging
from celery import shared_task
from django.db import transaction
from exam.models.checkpoints import Checkpoints
from exam.llm_call.checkpoint_generator import generate_checkpoints_testwise, generate_cumulative_checkpoints
from exam.graph_utils.retrieve_action_plan_data import get_action_plan_data
from exam.graph_utils.retrieve_cumulative_checkpoints_data import get_cumulative_checkpoints_data

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def populate_checkpoints_testwise(self, student_id: str, class_id: str, test_num: int):
    """
    Generate and store combined checkpoints for a student's test performance.
    
    Steps:
    1. Fetch weak topics data (same as actionplan/checklist)
    2. Call unified LLM to get 5 paired checkpoints + actions
    3. Store JSON directly in Checkpoints.insights
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    """
    try:
        logger.info(f"🔍 Starting checkpoint generation for student={student_id}, class={class_id}, test={test_num}")
        
        # Step 1: Get weak topics data (reuse existing function)
        weak_topics_data = get_action_plan_data(student_id, class_id, test_num)
        
        if not weak_topics_data or 'topics' not in weak_topics_data or not weak_topics_data['topics']:
            logger.info(f"✅ No weak topics for student {student_id} - no checkpoints needed")
            # Store empty insights
            with transaction.atomic():
                Checkpoints.objects.update_or_create(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=test_num,
                    defaults={'insights': []}
                )
            return
        
        # Step 2: Generate combined checkpoints via LLM
        logger.info(f"🤖 Calling LLM to generate combined checkpoints for student {student_id}")
        checkpoints = generate_checkpoints_testwise(student_id, class_id, test_num, weak_topics_data)
        
        if not checkpoints:
            logger.warning(f"⚠️ LLM returned no checkpoints for student {student_id}")
            checkpoints = []
        
        # Step 3: Store insights as JSON
        with transaction.atomic():
            Checkpoints.objects.update_or_create(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                defaults={'insights': checkpoints}
            )
        
        logger.info(f"✅ Successfully stored {len(checkpoints)} checkpoints for student {student_id}, test {test_num}")
        
    except Exception as e:
        logger.error(f"❌ Error in checkpoint generation task for student {student_id}: {e}", exc_info=True)
        # Retry the task up to max_retries times
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def populate_checkpoints_cumulative(self, student_id: str, class_id: str):
    """
    Generate and store cumulative checkpoints (all tests) for a student.
    Stored with test_num=0 to distinguish from test-wise checkpoints.
    
    Steps:
    1. Fetch cumulative data (all wrong questions grouped by topic and test)
    2. Call LLM to analyze patterns across tests
    3. Store in Checkpoints.insights with test_num=0 (update if exists, create if not)
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
    """
    try:
        logger.info(f"🔍 Starting cumulative checkpoint generation for student={student_id}, class={class_id}")
        
        # Step 1: Get cumulative data (all tests)
        cumulative_data = get_cumulative_checkpoints_data(student_id, class_id)
        
        if not cumulative_data or 'topics' not in cumulative_data or not cumulative_data['topics']:
            logger.info(f"✅ No cumulative topics for student {student_id} - no checkpoints needed")
            # Store empty insights with test_num=0
            with transaction.atomic():
                Checkpoints.objects.update_or_create(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=0,  # 0 indicates cumulative/overall
                    defaults={'insights': []}
                )
            return
        
        # Step 2: Generate cumulative checkpoints via LLM
        logger.info(f"🤖 Calling LLM to generate cumulative pattern analysis for student {student_id}")
        checkpoints = generate_cumulative_checkpoints(student_id, class_id, cumulative_data)
        
        if not checkpoints:
            logger.warning(f"⚠️ LLM returned no cumulative checkpoints for student {student_id}")
            checkpoints = []
        
        # Step 3: Store insights as JSON with test_num=0
        with transaction.atomic():
            obj, created = Checkpoints.objects.update_or_create(
                student_id=student_id,
                class_id=class_id,
                test_num=0,  # 0 = cumulative across all tests
                defaults={'insights': checkpoints}
            )
            action = "Created" if created else "Updated"
        
        logger.info(f"✅ {action} {len(checkpoints)} cumulative checkpoints for student {student_id} (test_num=0)")
        
    except Exception as e:
        logger.error(f"❌ Error in cumulative checkpoint generation task for student {student_id}: {e}", exc_info=True)
        # Retry the task up to max_retries times
        raise self.retry(exc=e)
