from exam.models import (
    Result, SWOT, Test, TestProcessingStatus,
    Overview, Performance, QuestionPaper, StudentResponse,
    QuestionAnalysis
)
from django.db import transaction
from exam.models.student import Student
from exam.graph_utils.delete_graph import delete_db, delete_test_graph
from exam.services.update_dashboard import update_student_dashboard
from exam.models.educator import Educator
import logging

logger = logging.getLogger(__name__)

def delete_test(class_id, test_num):
    """
    Deletes all data for a specific class_id and test_num across all tables
    EXCEPT the Educator table.
        This function also deletes the test graph from the Neo4j database.
    Args:
        class_id (str): The ID of the class.
        test_num (int): The test number.
    """

    try:
        students = Student.objects.filter(class_id=class_id)
        if not students:
            logger.warning(f"⚠️ No students found for class {class_id}.")
            #print(f"⚠️ No students found for class {class_id}.")
            return

        student_ids = [s.student_id for s in students]
        student_dbs = {s.student_id: s.neo4j_db for s in students}
        for student_id in student_ids:
            db_name = str(student_dbs[student_id]).lower()
            delete_test_graph(db_name, test_num)
    except Exception as e:
        logger.error(f"❌ Students not found: {str(e)}")
        #print(f"❌ Students not found: {str(e)}")



    try:
        with transaction.atomic():
            # These models use both class_id and test_num
            StudentResponse.objects.filter(class_id=class_id, test_num=test_num).delete()
            SWOT.objects.filter(class_id=class_id, test_num=test_num).delete()
            QuestionPaper.objects.filter(class_id=class_id, test_num=test_num).delete()
            Test.objects.filter(class_id=class_id, test_num=test_num).delete()
            TestProcessingStatus.objects.filter(class_id=class_id, test_num=test_num).delete()
            QuestionAnalysis.objects.filter(class_id=class_id, test_num=test_num).delete()

            # These models use only class_id (test_num not used)
            Overview.objects.filter(class_id=class_id).delete()
            Performance.objects.filter(class_id=class_id).delete()

    except Exception as e:
        logger.error(f"❌ could'nt delete test data from db: {str(e)}")
        #print(f"❌ could'nt delete test data from db: {str(e)}")
    if test_num>1:
        update_student_dashboard(class_id, test_num-1)


def delete_student(class_id):

    """
    Deletes all data for a specific class_id across all tables
    EXCEPT the Educator table.
    Args:
        class_id (str): The ID of the class.
    """

    try:
        students = Student.objects.filter(class_id=class_id)
        if not students:
            logger.warning(f"⚠️ No students found for class {class_id}.")
            #print(f"⚠️ No students found for class {class_id}.")
            return

        student_ids = [s.student_id for s in students]
        student_dbs = {s.student_id: s.neo4j_db for s in students}
        for student_id in student_ids:
            db_name = str(student_dbs[student_id]).lower()
            delete_db(db_name)
    except Exception as e:
        logger.error(f"❌ Students not found: {str(e)}")
        #print(f"❌ Students not found: {str(e)}")



    try:
        with transaction.atomic():
            # These models use both class_id and test_num
            StudentResponse.objects.filter(class_id=class_id).delete()
            SWOT.objects.filter(class_id=class_id).delete()
            QuestionPaper.objects.filter(class_id=class_id).delete()
            Test.objects.filter(class_id=class_id).delete()
            TestProcessingStatus.objects.filter(class_id=class_id).delete()
            QuestionAnalysis.objects.filter(class_id=class_id).delete()
            Student.objects.filter(class_id=class_id).delete()

            # These models use only class_id (test_num not used)
            Overview.objects.filter(class_id=class_id).delete()
            Performance.objects.filter(class_id=class_id).delete()

    except Exception as e:
        logger.error(f"❌ could'nt delete test data from db: {str(e)}")
        #print(f"❌ could'nt delete test data from db: {str(e)}")

def delete_institution(class_id):
    """
    Deletes all data for a specific class_id across all tables
    including the Educator table.
    Args:
        class_id (str): The ID of the class.
    """
    try:
        delete_student(class_id)
        Educator.objects.filter(class_id=class_id).delete()
        logger.info(f"✅ Deleted all data for class {class_id}")
        #print(f"✅ Deleted all data for class {class_id}")
    except Exception as e:
        logger.error(f"❌ Error deleting data for class {class_id}: {str(e)}")
        #print(f"❌ Error deleting data for class {class_id}: {str(e)}")
