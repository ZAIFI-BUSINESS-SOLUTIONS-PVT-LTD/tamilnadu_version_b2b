from celery import shared_task
from exam.utils.csv_processing import process_student_csv
from exam.models.educator import Educator
from exam.ingestions.populate_student import save_students_to_db
import logging
import sentry_sdk

logger = logging.getLogger(__name__)

@shared_task
def save_students(email, class_id):
    """
    Handles the saving of student data from a CSV file to the database.
    Args:
        email (str): The email of the educator.
        class_id (str): The ID of the class.
    """
    educator = Educator.objects.filter(email=email).first()

    educator.csv_status = "started"
    educator.save(update_fields=["csv_status"])
    folder = f"inzighted/uploads/{class_id}/"
    csv_path = folder + "stud.csv"

    students = process_student_csv(csv_path, class_id)
    if students:
        logger.info(students)
        #print(students)
        try:
            save_students_to_db(students)
            # ✅ Update Educator's First Time Login Status
            educator.csv_status = "completed"
            educator.save(update_fields=["csv_status"])
            logger.info(f"saving students sucessfull for class {class_id}")
            #print(f"saving students sucessfull for class {class_id}")   
        except Exception as e:
            educator.csv_status = "failed"
            educator.save(update_fields=["csv_status"])
            logger.exception(f"saving students failed for class {class_id}")
            #print(f"saving students failed for class {class_id}")
    
    else:
        educator.csv_status = "failed"
        educator.save(update_fields=["csv_status"])
        logger.warning(f"No student found in class {class_id}")
        #print(f"No student found in class {class_id}")


    
