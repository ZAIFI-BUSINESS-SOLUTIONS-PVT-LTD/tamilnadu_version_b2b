from exam.models.response import StudentResponse
from exam.models.test_status import TestProcessingStatus
import logging

logger = logging.getLogger(__name__)

def save_student_response(class_id, test_num, response_dict):
    
    """
    Saves parsed answer sheet data to the database using the StudentResponse model.
    `data` should be a list of dicts containing student_id, question_number, selected_answer.
    """
    status_obj, _ = TestProcessingStatus.objects.get_or_create(
            class_id=class_id, test_num=test_num
        )
    response_objects = []

    for entry in response_dict:
        response = StudentResponse(
            student_id=entry["student_id"],
            class_id=class_id,
            test_num=test_num,
            question_number=entry["question_number"],
            selected_answer=entry["selected_answer"]
        )
        response_objects.append(response)

    # Bulk insert
    StudentResponse.objects.bulk_create(response_objects, ignore_conflicts=True)
    status_obj.logs += f"✅ {len(response_objects)} responses saved to DB."
    status_obj.save()
    logger.info(f"✅ {len(response_objects)} responses saved to DB.")
    #print(f"✅ {len(response_objects)} responses saved to DB.")


