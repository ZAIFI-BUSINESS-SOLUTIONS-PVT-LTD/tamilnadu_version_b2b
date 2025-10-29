from exam.models.student import Student
from exam.ingestions.populate_overview import Populate_Overview, Save_Overview_Metric
from exam.insight.overview_data_generator import Generate_overview_data, Generate_overview_data_educator
from exam.insight.performance_genertor import generate_perfomance_data
from exam.ingestions.populate_performance import Populate_performance
from exam.ingestions.populate_swot import save_swot_metric
from exam.insight.swot_generator import generate_all_test_swot_with_AI, generate_swot_data_with_AI, Generate_SWOT_educator
from exam.utils.student_analysis import fetch_student_responses
from exam.models.test_status import TestProcessingStatus
import logging
from django.utils.timezone import now
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def update_student_dashboard(class_id, test_num=None):
    """
    Updates the student dashboard with performance metrics and insights.
    Args:
        class_id (str): The ID of the class.
        test_num (int, optional): The test number. If None, fetches cumulative data.
    """
    status_obj = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test_num).first()
    

    # ✅ Fetch all students in the class
    students = Student.objects.filter(class_id=class_id)
    if not students:
        status_obj.logs += f"⚠️ No students found for class {class_id}."
        status_obj.save()
        logger.warning(f"⚠️ No students found for class {class_id}.")
        #print(f"⚠️ No students found for class {class_id}.")
        return

    student_ids = [s.student_id for s in students]
    student_dbs = {s.student_id: s.neo4j_db for s in students}
    for student_id in student_ids:
        response_map = fetch_student_responses(student_id, class_id, test_num)

        # ⛔ Skip students with no responses
        if not response_map:
            status_obj.logs += f"🚫 Student {student_id} did not attend test {test_num}. Skipping."
            status_obj.save()
            logger.info(f"🚫 Student {student_id} did not attend test {test_num}. Skipping.")
            #print(f"🚫 Student {student_id} did not attend test {test_num}. Skipping.")
            continue
        db_name = str(student_dbs[student_id]).lower()
        metrics, insights, PT, SA = Generate_overview_data(db_name)
        logger.info(f"✅ Overview data generated for {student_id} test{test_num}")

        Populate_Overview(
            user_id=student_id,
            class_id=class_id,
            metrics=metrics,
            insights=insights,
            performance_trend=PT,
            subject_analysis=SA
            )

        performance_graph, performance_insights = generate_perfomance_data(db_name)
        Populate_performance(student_id, class_id, performance_insights, performance_graph)

        overall_swot = generate_all_test_swot_with_AI(db_name)

        save_swot_metric(student_id, class_id,0 , "swot", overall_swot)
        status_obj.status = "Successful"
        status_obj.logs += f"✅cumulative SWOT saved for {student_id} test{test_num}"
        status_obj.save()
        logger.info(f"✅cumulative SWOT saved for {student_id} test{test_num}")
        #print(f"✅cumulative SWOT saved for {student_id} test{test_num}")

        if test_num:
            test_wise_swot = generate_swot_data_with_AI(db_name, test_num)
            save_swot_metric(student_id, class_id,test_num , "swot", test_wise_swot)
            status_obj.status = "Successful"
            status_obj.logs += f"✅Test wise swot saved for {student_id} test{test_num}"
            status_obj.save()
            logger.info(f"✅Test wise swot saved for {student_id} test{test_num}")
            #print(f"✅Test wise swot saved for {student_id} test{test_num}")




@shared_task
def update_educator_dashboard(class_id, test_num):
    """
    Updates the educator dashboard with performance metrics and insights.
    Args:
        class_id (str): The ID of the class.
        test_num (int, optional): The test number. If None, fetches cumulative data.
    """
    
    status_obj, _ = TestProcessingStatus.objects.get_or_create(
        class_id=class_id, test_num=test_num,
        defaults={"status": "PROCESSING", "started_at": now()}
    )    
    aggregated_metrics, insight_key_map,keyInsightsData, email = Generate_overview_data_educator(class_id)


    # ✅ Save aggregated metrics
    for metric_key, value in aggregated_metrics.items():
        Save_Overview_Metric(user_id=email, class_id=class_id, metric_name=metric_key, metric_value=value)

    for insight_label, metric_key in insight_key_map.items():
        insight_value = keyInsightsData.get(insight_label, [])
        Save_Overview_Metric(user_id=email, class_id=class_id, metric_name=metric_key, metric_value=insight_value)
    status_obj.status = "Successful"
    status_obj.logs += "✅ Educator dashboard metrics saved successfully."
    status_obj.save()
    logger.info("✅ Educator dashboard metrics saved successfully.")
    #print("✅ Educator dashboard metrics saved successfully.")

    cumulative_swot = Generate_SWOT_educator(class_id,0)
    status_obj.status = "Successful"
    status_obj.logs += "✅ Educator dashboard cumulative swot saved successfully."
    status_obj.save()
    logger.info("✅ Educator dashboard cumulative swot saved successfully.")
    #print("✅ Educator dashboard cumulative swot saved successfully.")
    # ✅ Save cumulative SWOT
    swot = Generate_SWOT_educator(class_id,test_num)
    status_obj.status = "Successful"
    status_obj.logs += "✅ Educator dashboard cumulative swot saved successfully."
    status_obj.save()
    logger.info("✅ Educator dashboard cumulative swot saved successfully.")
    #print("✅ Educator dashboard cumulative swot saved successfully.")
    # ✅ Final output for return or preview
    save_swot_metric(email, class_id,0 , "swot", cumulative_swot)
    save_swot_metric(email, class_id,test_num , "swot", swot)
    status_obj.status = "Successful"
    status_obj.logs += "✅ Educator dashboard updated successfully."
    status_obj.save()
    logger.info("✅ Educator dashboard updated successfully.")
    #print("✅ Educator dashboard updated successfully.")