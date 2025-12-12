from exam.models.student import Student
from exam.ingestions.populate_overview import Populate_Overview, Save_Overview_Metric
from exam.insight.overview_data_generator import Generate_overview_data, Generate_overview_data_educator
from exam.insight.performance_genertor import generate_perfomance_data
from exam.ingestions.populate_performance import Populate_performance
from exam.ingestions.populate_swot import save_swot_metric
from exam.insight.swot_generator import generate_all_test_swot_with_AI, generate_swot_data_with_AI, Generate_SWOT_educator
from exam.utils.student_analysis import fetch_student_responses
from exam.models.test_status import TestProcessingStatus
from exam.services.whatsapp_notification import send_whatsapp_notification
import logging
import time
from django.utils.timezone import now
from celery import shared_task, chord
from functools import wraps

logger = logging.getLogger(__name__)

# ==================== Safety Utility Functions ====================

def ensure_dict(data, default=None):
    """
    Ensures data is a dictionary. Converts non-dict types to empty dict or default.
    
    Args:
        data: Any data type
        default: Default dict to return if data is invalid (default: {})
    
    Returns:
        dict: Valid dictionary or default
    """
    if default is None:
        default = {}
    
    if isinstance(data, dict):
        return data
    
    # Log unexpected type for debugging
    if data is not None:
        logger.warning(f"⚠️ ensure_dict: Expected dict, got {type(data).__name__}. Converting to empty dict.")
    
    return default.copy() if isinstance(default, dict) else {}


def ensure_list(data, default=None):
    """
    Ensures data is a list. Converts non-list types to empty list or default.
    
    Args:
        data: Any data type
        default: Default list to return if data is invalid (default: [])
    
    Returns:
        list: Valid list or default
    """
    if default is None:
        default = []
    
    if isinstance(data, list):
        return data
    
    if data is not None:
        logger.warning(f"⚠️ ensure_list: Expected list, got {type(data).__name__}. Converting to empty list.")
    
    return default.copy() if isinstance(default, list) else []


def neo4j_retry(max_attempts=3, initial_delay=1, backoff_factor=2):
    """
    Decorator to retry Neo4j operations with exponential backoff.
    
    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        backoff_factor: Multiplier for exponential backoff
    
    Returns:
        Decorated function with retry logic
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"⚠️ Neo4j operation {func.__name__} failed (attempt {attempt}/{max_attempts}): {e}"
                    )
                    
                    if attempt < max_attempts:
                        logger.info(f"🔄 Retrying in {delay}s...")
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(
                            f"❌ Neo4j operation {func.__name__} failed after {max_attempts} attempts: {last_exception}"
                        )
            
            # Return safe defaults based on expected return types
            return _get_safe_default_for_function(func.__name__)
        
        return wrapper
    return decorator


def _get_safe_default_for_function(func_name):
    """
    Returns safe default values for known functions after max retry failures.
    
    Args:
        func_name: Name of the function that failed
    
    Returns:
        Safe default value appropriate for the function
    """
    # Overview data returns: metrics, insights, PT, SA
    if 'overview' in func_name.lower():
        return {}, {}, {}, {}
    
    # Performance data returns: graph, insights
    if 'performance' in func_name.lower() or 'perfomance' in func_name.lower():
        return {}, {}
    
    # SWOT returns: swot dict
    if 'swot' in func_name.lower():
        return {}
    
    # Generic fallback
    return None


def _internal_student_dashboard_update(student_id, class_id, test_num, db_name):
    """
    Internal implementation: Updates dashboard for a single student.
    Pure business logic without error handling (wrapper handles safety).
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        test_num (int): Test number
        db_name (str): Neo4j database name for the student
    
    Returns:
        dict: Result data with metrics, insights, and status
    """
    status_obj = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test_num).first()
    result = {
        'student_id': student_id,
        'overview': None,
        'performance': None,
        'swot_cumulative': None,
        'swot_test': None
    }
    
    # Generate overview data with Neo4j retry
    @neo4j_retry(max_attempts=3)
    def fetch_overview():
        return Generate_overview_data(db_name, student_id, class_id, test_num)
    
    metrics, insights, PT, SA, action_plan, checklist, study_tips = fetch_overview()
    
    # Validate and ensure dict structure
    metrics = ensure_dict(metrics, default={})
    insights = ensure_dict(insights, default={})
    PT = ensure_dict(PT, default={})
    SA = ensure_list(SA, default=[])  # SA is a list of test-wise subject score records
    action_plan = ensure_list(action_plan, default=[])
    checklist = ensure_list(checklist, default=[])
    study_tips = ensure_list(study_tips, default=[])
    logger.info(f"data of SA {SA}")
    logger.info(f"✅ Overview data generated for {student_id} test {test_num}")

    # Populate overview
    Populate_Overview(
        user_id=student_id,
        class_id=class_id,
        metrics=metrics,
        insights=insights,
        performance_trend=PT,
        subject_analysis=SA
    )
    
    # Save action plan
    if action_plan:
        Save_Overview_Metric(student_id, class_id, "AP", action_plan)
        logger.info(f"✅ Action plan saved for {student_id} with {len(action_plan)} items")
    
    # Save checklist
    if checklist:
        Save_Overview_Metric(student_id, class_id, "CL", checklist)
        logger.info(f"✅ Checklist saved for {student_id} with {len(checklist)} checkpoints")
    
    # Save study tips
    if study_tips:
        Save_Overview_Metric(student_id, class_id, "ST", study_tips)
        logger.info(f"✅ Study tips saved for {student_id} with {len(study_tips)} tips")
    
    result['overview'] = {'metrics': metrics, 'insights': insights, 'PT': PT, 'SA': SA, 'AP': action_plan, 'CL': checklist, 'ST': study_tips}

    # Generate and populate performance data with Neo4j retry
    @neo4j_retry(max_attempts=3)
    def fetch_performance():
        return generate_perfomance_data(db_name)
    
    performance_graph, performance_insights = fetch_performance()
    
    # Validate structure
    performance_graph = ensure_dict(performance_graph, default={})
    performance_insights = ensure_dict(performance_insights, default={})
    
    Populate_performance(student_id, class_id, performance_insights, performance_graph)
    result['performance'] = {'graph': performance_graph, 'insights': performance_insights}

    # Generate and save cumulative SWOT with Neo4j retry
    @neo4j_retry(max_attempts=3)
    def fetch_cumulative_swot():
        return generate_all_test_swot_with_AI(db_name)
    
    overall_swot = fetch_cumulative_swot()
    overall_swot = ensure_dict(overall_swot, default={})
    
    save_swot_metric(student_id, class_id, 0, "swot", overall_swot)
    result['swot_cumulative'] = overall_swot
    
    if status_obj:
        status_obj.logs += f"✅ Cumulative SWOT saved for {student_id} test {test_num}\n"
        status_obj.save()
    logger.info(f"✅ Cumulative SWOT saved for {student_id} test {test_num}")

    # Generate and save test-wise SWOT if test_num provided
    if test_num:
        @neo4j_retry(max_attempts=3)
        def fetch_test_swot():
            return generate_swot_data_with_AI(db_name, test_num)
        
        test_wise_swot = fetch_test_swot()
        test_wise_swot = ensure_dict(test_wise_swot, default={})
        
        save_swot_metric(student_id, class_id, test_num, "swot", test_wise_swot)
        result['swot_test'] = test_wise_swot
        
        if status_obj:
            status_obj.logs += f"✅ Test-wise SWOT saved for {student_id} test {test_num}\n"
            status_obj.save()
        logger.info(f"✅ Test-wise SWOT saved for {student_id} test {test_num}")
    
    logger.info(f"✅ Dashboard update completed for student {student_id}")
    return result


@shared_task
def update_single_student_dashboard(student_id, class_id, test_num, db_name):
    """
    Safe wrapper for student dashboard updates. Never raises exceptions.
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
        test_num (int): Test number
        db_name (str): Neo4j database name for the student
    
    Returns:
        dict: Result with structure {ok: bool, student: str, data: dict | error: str}
    """
    logger.info(f"🎯 Updating dashboard for student {student_id}, class {class_id}, test {test_num}")
    
    try:
        # Call internal implementation
        data = _internal_student_dashboard_update(student_id, class_id, test_num, db_name)
        
        return {
            'ok': True,
            'student': student_id,
            'data': data
        }
        
    except Exception as e:
        logger.error(f"❌ Error updating dashboard for student {student_id}: {str(e)}", exc_info=True)
        
        # Log to status obj if available
        try:
            status_obj = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test_num).first()
            if status_obj:
                status_obj.logs += f"❌ Error for {student_id}: {str(e)}\n"
                status_obj.save()
        except Exception as log_error:
            logger.error(f"❌ Failed to log error to status: {log_error}")
        
        # Return error structure instead of raising
        return {
            'ok': False,
            'student': student_id,
            'error': str(e)
        }


@shared_task
def update_student_dashboard(class_id, test_num=None):
    """
    Coordinates parallel dashboard updates for all students in a class.
    Dispatches individual student tasks and triggers educator dashboard update after completion.
    
    Args:
        class_id (str): The ID of the class.
        test_num (int, optional): The test number. If None, fetches cumulative data.
    """
    logger.info(f"🎯 Starting update_student_dashboard for class {class_id}, test {test_num}")
    status_obj = TestProcessingStatus.objects.filter(class_id=class_id, test_num=test_num).first()
    
    # ✅ Fetch all students in the class
    students = Student.objects.filter(class_id=class_id)
    if not students:
        if status_obj:
            status_obj.logs += f"⚠️ No students found for class {class_id}.\n"
            status_obj.save()
        logger.warning(f"⚠️ No students found for class {class_id}.")
        return

    # ✅ Build task list for students who attended the test
    tasks = []
    for student in students:
        response_map = fetch_student_responses(student.student_id, class_id, test_num)

        # ⛔ Skip students with no responses
        if not response_map:
            if status_obj:
                status_obj.logs += f"🚫 Student {student.student_id} did not attend test {test_num}. Skipping.\n"
                status_obj.save()
            logger.info(f"🚫 Student {student.student_id} did not attend test {test_num}. Skipping.")
            continue
        
        db_name = str(student.neo4j_db).lower()
        tasks.append(
            update_single_student_dashboard.s(student.student_id, class_id, test_num, db_name)
        )
    
    if tasks:
        logger.info(f"🔄 Scheduling {len(tasks)} student dashboard update tasks for class {class_id}, test {test_num}...")
        
        # Use chord: run all student dashboard tasks in parallel, then trigger educator update
        # Use immutable signature (.si) to prevent prepending results to callback arguments
        chord(tasks)(update_educator_dashboard.si(class_id, test_num))
        
        logger.info(f"✅ Student dashboard tasks scheduled with educator update callback for class {class_id}, test {test_num}")
    else:
        logger.warning(f"⚠️ No student dashboard tasks to schedule for class {class_id}, test {test_num}")
        # No students to process, but still trigger educator dashboard
        logger.info(f"🎓 Triggering educator dashboard update directly for class {class_id}, test {test_num}")
        update_educator_dashboard.apply_async(args=(class_id, test_num))


@shared_task
def update_educator_dashboard(class_id, test_num, student_results=None):
    """
    Updates the educator dashboard with performance metrics and insights.
    Handles list of student results from chord callback safely.
    
    Args:
        class_id (str): The ID of the class.
        test_num (int, optional): The test number. If None, fetches cumulative data.
        student_results (list, optional): List of student task results from chord
    """
    logger.info(f"🎓 Starting update_educator_dashboard for class {class_id}, test {test_num}")
    
    # Log student results summary if provided
    if student_results:
        student_results = ensure_list(student_results, default=[])
        successful = sum(1 for r in student_results if ensure_dict(r).get('ok'))
        failed = len(student_results) - successful
        logger.info(f"📊 Student results: {successful} successful, {failed} failed out of {len(student_results)}")
    
    status_obj, _ = TestProcessingStatus.objects.get_or_create(
        class_id=class_id, test_num=test_num,
        defaults={"status": "PROCESSING", "started_at": now()}
    )    
    
    try:
        aggregated_metrics, insight_key_map, keyInsightsData, email = Generate_overview_data_educator(class_id)
        
        # Validate structures
        aggregated_metrics = ensure_dict(aggregated_metrics, default={})
        insight_key_map = ensure_dict(insight_key_map, default={})
        keyInsightsData = ensure_dict(keyInsightsData, default={})
    except Exception as e:
        logger.error(f"❌ Error generating educator overview data: {e}", exc_info=True)
        aggregated_metrics = {}
        insight_key_map = {}
        keyInsightsData = {}
        email = None
        
        try:
            from exam.models.educator import Educator
            educator = Educator.objects.filter(class_id=class_id).first()
            email = educator.email if educator else None
        except Exception:
            pass
    
    if not email:
        logger.error(f"❌ No educator email found for class {class_id}")
        status_obj.status = "Failed"
        status_obj.logs += "❌ No educator email found\n"
        status_obj.save()
        return
    
    aggregated_metrics = ensure_dict(aggregated_metrics)

    # ✅ Save aggregated metrics with safety
    try:
        for metric_key, value in aggregated_metrics.items():
            Save_Overview_Metric(user_id=email, class_id=class_id, metric_name=metric_key, metric_value=value)

        for insight_label, metric_key in insight_key_map.items():
            insight_value = keyInsightsData.get(insight_label, [])
            Save_Overview_Metric(user_id=email, class_id=class_id, metric_name=metric_key, metric_value=insight_value)
        
        status_obj.logs += "✅ Educator dashboard metrics saved successfully.\n"
        status_obj.save()
        logger.info("✅ Educator dashboard metrics saved successfully.")
    except Exception as e:
        logger.error(f"❌ Error saving educator metrics: {e}", exc_info=True)
        status_obj.logs += f"⚠️ Partial failure saving metrics: {e}\n"
        status_obj.save()

    # Generate and save cumulative SWOT with retry
    try:
        @neo4j_retry(max_attempts=3)
        def fetch_cumulative_swot_educator():
            return Generate_SWOT_educator(class_id, 0)
        
        cumulative_swot = fetch_cumulative_swot_educator()
        cumulative_swot = ensure_dict(cumulative_swot, default={})
        
        save_swot_metric(email, class_id, 0, "swot", cumulative_swot)
        status_obj.logs += "✅ Educator dashboard cumulative swot saved successfully.\n"
        status_obj.save()
        logger.info("✅ Educator dashboard cumulative swot saved successfully.")
    except Exception as e:
        logger.error(f"❌ Error saving cumulative SWOT: {e}", exc_info=True)
        status_obj.logs += f"⚠️ Failed to save cumulative SWOT: {e}\n"
        status_obj.save()
    
    # Generate and save test-wise SWOT with retry
    try:
        @neo4j_retry(max_attempts=3)
        def fetch_test_swot_educator():
            return Generate_SWOT_educator(class_id, test_num)
        
        swot = fetch_test_swot_educator()
        swot = ensure_dict(swot, default={})
        
        save_swot_metric(email, class_id, test_num, "swot", swot)
        status_obj.logs += "✅ Educator dashboard test-wise swot saved successfully.\n"
        status_obj.save()
        logger.info("✅ Educator dashboard test-wise swot saved successfully.")
    except Exception as e:
        logger.error(f"❌ Error saving test-wise SWOT: {e}", exc_info=True)
        status_obj.logs += f"⚠️ Failed to save test-wise SWOT: {e}\n"
        status_obj.save()
    
    # Final status update
    status_obj.status = "Successful"
    status_obj.logs += "✅ Educator dashboard updated successfully.\n"
    try:
        status_obj.ended_at = now()
    except Exception:
        pass
    status_obj.save()
    logger.info("✅ Educator dashboard updated successfully.")
    
    # 🔔 Trigger WhatsApp notification after successful completion
    try:
        # Get educator for this class
        from exam.models.educator import Educator
        educator = Educator.objects.filter(class_id=class_id).first()
        
        if educator and educator.phone_number:
            logger.info(f"📱 Scheduling WhatsApp notification for {educator.email}")
            # Schedule async task (non-blocking)
            send_whatsapp_notification.delay(class_id, test_num, educator.id)
        else:
            if educator:
                logger.info(f"ℹ️ Educator {educator.email} has no phone number - skipping WhatsApp notification")
            else:
                logger.warning(f"⚠️ No educator found for class {class_id}")
    except Exception as notification_error:
        # Never let notification errors break the pipeline
        logger.error(f"⚠️ Error scheduling WhatsApp notification: {notification_error}", exc_info=True)
        status_obj.logs += f"⚠️ WhatsApp notification error (non-critical): {notification_error}\n"
        status_obj.save()