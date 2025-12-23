from exam.utils.question_analysis import analyse_questions 
from exam.utils.student_analysis import analyse_students
from exam.services.update_dashboard import update_student_dashboard, update_educator_dashboard
from celery import shared_task
from django.utils.timezone import now
from exam.models.test_status import TestProcessingStatus
import logging
import sentry_sdk

logger = logging.getLogger(__name__)

@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,         # exponential backoff: 2s, 4s, 8s, ...
    retry_kwargs={'max_retries': 1},  # you can increase this
    retry_jitter=True           # randomizes retry delay slightly
)
def start_from_analysis(class_id, test_num):
    status_obj = TestProcessingStatus.objects.filter(
        class_id=class_id, test_num=test_num
    ).first()
    try:
        logger.info(f"🚀 analysing test {test_num} for class {class_id}...")
        #print(f"🚀 analysing test {test_num} for class {class_id}...")
        analyse_questions(class_id, test_num)
        status_obj.status = "Analyzing"
        status_obj.logs += "\nrestarting Analyzing data..."
        status_obj.save()

        try:
            logger.info(f"🚀 starting student analysis for {test_num} for class {class_id}...")
            #print(f"🚀 starting student analysis for {test_num} for class {class_id}...")
            status_obj.logs += f"\n starting student analysis for {test_num} for class {class_id}..."
            analyse_students(class_id, test_num)
            # analysis tasks scheduled — do not mark final success here
            status_obj.logs += "\n✅ Processing completed (analysis scheduled)"
            status_obj.save()
            try:
                logger.info(f"🚀 Updating students dashboard {test_num} for class {class_id}...")
                #print(f"🚀 Updating students dashboard {test_num} for class {class_id}...")
                status_obj.logs += f"\n Updating students dashboard {test_num} for class {class_id}..."
                update_student_dashboard(class_id, test_num)
                status_obj.save()
                logger.info(f"🚀 Updated students dashboard {test_num} for class {class_id}...")
                #print(f"🚀 Updated students dashboard {test_num} for class {class_id}...")
                status_obj.logs += f"\n Updated students dashboard {test_num} for class {class_id}..."
                status_obj.save()
                update_educator_dashboard(class_id, test_num)
                    

            except Exception as e:
                status_obj.status = "Failed"
                status_obj.logs += f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}"
                status_obj.save()
                logger.exception(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")
                #print(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")
            
        except Exception as e:
            status_obj.status = "Failed"
            status_obj.logs += f"❌ Error analysing student {test_num} for class {class_id}: {e}"
            status_obj.save()
            logger.exception(f"❌ Error analysing student {test_num} for class {class_id}: {e}")
            #print(f"❌ Error analysing student {test_num} for class {class_id}: {e}")

    except Exception as e:
        status_obj.status = "Failed"
        status_obj.logs += f"❌ Error analysing test {test_num} for class {class_id}: {e}"
        status_obj.save()
        logger.exception(f"❌ Error analysing test {test_num} for class {class_id}: {e}")
        #print(f"❌ Error analysing test {test_num} for class {class_id}: {e}")


@shared_task(
    autoretry_for=(Exception,),
    retry_backoff=True,         # exponential backoff: 2s, 4s, 8s, ...
    retry_kwargs={'max_retries': 1},  # you can increase this
    retry_jitter=True           # randomizes retry delay slightly
)
def start_from_student_analysis(class_id, test_num):

    status_obj = TestProcessingStatus.objects.filter(
        class_id=class_id, test_num=test_num
    ).first()
    status_obj.logs += f"\n starting student analysis for {test_num} for class {class_id}..."

    try:
        logger.info(f"🚀 starting student analysis for {test_num} for class {class_id}...")
        #print(f"🚀 starting student analysis for {test_num} for class {class_id}...")
        status_obj.logs += f"\n starting student analysis for {test_num} for class {class_id}..."
        analyse_students(class_id, test_num)
        # analysis tasks scheduled — do not mark final success here
        status_obj.logs += "\n✅ Processing completed (analysis scheduled)"
        status_obj.save()
        try:
            logger.info(f"🚀 Updating students dashboard {test_num} for class {class_id}...")
            #print(f"🚀 Updating students dashboard {test_num} for class {class_id}...")
            status_obj.logs += f"\n Updating students dashboard {test_num} for class {class_id}..."
            update_student_dashboard(class_id, test_num)
            status_obj.save()
            logger.info(f"🚀 Updated students dashboard {test_num} for class {class_id}...")
            #print(f"🚀 Updated students dashboard {test_num} for class {class_id}...")
            status_obj.logs += f"\n Updated students dashboard {test_num} for class {class_id}..."
            status_obj.save()
            update_educator_dashboard(class_id, test_num)
                    

        except Exception as e:
            status_obj.status = "Failed"
            status_obj.logs += f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}"
            status_obj.save()
            logger.exception(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")
            #print(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")
            
    except Exception as e:
        status_obj.status = "Failed"
        status_obj.logs += f"❌ Error analysing student {test_num} for class {class_id}: {e}"
        status_obj.save()
        logger.exception(f"❌ Error analysing student {test_num} for class {class_id}: {e}")
        #print(f"❌ Error analysing student {test_num} for class {class_id}: {e}")

@shared_task
def start_dashboard_update(class_id, test_num):

    status_obj = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test_num).first()
    if status_obj:
        status_obj.logs = (status_obj.logs or "") + "..."
        status_obj.save()
    
    try:
        logger.info(f"🚀 Updating students dashboard {test_num} for class {class_id}...")
        #print(f"🚀 Updating students dashboard {test_num} for class {class_id}...")
        status_obj.logs += f"\n Updating students dashboard {test_num} for class {class_id}..."
        update_student_dashboard(class_id, test_num)
        status_obj.save()
        logger.info(f"🚀 Updated students dashboard {test_num} for class {class_id}...")
        #print(f"🚀 Updated students dashboard {test_num} for class {class_id}...")
        status_obj.logs += f"\n Updated students dashboard {test_num} for class {class_id}..."
        status_obj.save()
        update_educator_dashboard(class_id, test_num)
                    

    except Exception as e:
        status_obj.status = "Failed"
        status_obj.logs += f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}"
        status_obj.save()
        logger.exception(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")
        status_obj.logs += f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}"
        status_obj.save()
        logger.error(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")
        #print(f"❌ Error Updating students dashboard {test_num} for class {class_id}: {e}")