from django.db import transaction
from exam.models.student import Student
import logging
import sentry_sdk

logger = logging.getLogger(__name__)

def save_students_to_db(students):
    try:
        with transaction.atomic():
            Student.objects.bulk_create(students)
        logger.info("✅ Students saved successfully.")
        #print("✅ Students saved successfully.")
    except Exception as e:
        logger.exception(f"❌ Failed to save students: {str(e)}")
        #print(f"❌ Failed to save students: {str(e)}")
        raise  # re-raise so the caller also catches it