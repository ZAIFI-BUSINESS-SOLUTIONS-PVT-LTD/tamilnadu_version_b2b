# populate_dashboard.py

from exam.models.overview import Overview
import json
import logging

logger = logging.getLogger(__name__)

def Save_Overview_Metric(user_id, class_id, metric_name, metric_value):
    """
    Save a single metric or insight into the Dashboard table.
    Lists and dicts are converted to JSON strings for storage.
    """
    if isinstance(metric_value, (list, dict)):
        metric_value = json.dumps(metric_value)

    Overview.objects.update_or_create(
        user_id=user_id,
        class_id=class_id,
        metric_name=metric_name,
        defaults={"metric_value": str(metric_value)}
    )


def Populate_Overview(user_id, class_id, metrics, insights, performance_trend, subject_analysis):
    """
    Populates the Dashboard model using already computed data.

    Args:
        user_id (str): Unique student ID
        class_id (str): Class identifier
        test_num (int): Test number
        metrics (dict): Core metrics (OP, IR, TT, CV)
        insights (dict): AI-generated insights (KS, AI, QR, CV)
        performance_trend (Any): Performance trend data (e.g., test-wise scores)
        subject_analysis (Any): Subject-wise score breakdown
    """


    
    # Save scalar metrics (OP, TT, IR, CV)
    for metric, value in metrics.items():
        Save_Overview_Metric(user_id, class_id, metric, value)

    # Save insights (each as a list of 3 strings)
    for insight_type, insight_list in insights.items():
        Save_Overview_Metric(user_id, class_id, insight_type, insight_list)

    # Save performance trend
    Save_Overview_Metric(user_id, class_id, "PT", performance_trend)

    # Save subject analysis
    Save_Overview_Metric(user_id, class_id, "SA", subject_analysis)
    logger.info(f"✅ overview populated for {user_id} | {class_id} |")
    #print(f"✅ overview populated for {user_id} | {class_id} |")
