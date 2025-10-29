import pandas as pd
import json
from exam.models.performance import Performance
import logging

logger = logging.getLogger(__name__)

def save_performance_metric(user_id, class_id, subject, metric_name, metric_value):
    """
    Save a single performance metric into the Performance table.
    Converts lists, dicts, and DataFrames to JSON strings before saving.
    """
    if isinstance(metric_value, (pd.DataFrame)):
        metric_value = metric_value.to_dict()
    elif isinstance(metric_value, (list, dict)):
        metric_value = json.loads(json.dumps(metric_value))  # Ensures clean JSON

    Performance.objects.update_or_create(
        user_id=user_id,
        class_id=class_id,
        subject=subject,
        metric_name=metric_name,
        defaults={"metric_value": json.dumps(metric_value)}
    )


def Populate_performance(user_id, class_id, performance_insights, performance_graph):
    """
    Populates the Performance model per subject:
    - Saves all SWOT insights as 'CI' (DataFrame dict)
    - Saves performance graph as 'PT' (DataFrame dict)

    Args:
        user_id (str): Unique user ID
        class_id (str): Class identifier
        test_num (int): Test number
        performance_insights (dict): SWOT insights per subject
        performance_graph (dict): Accuracy graph per subject
    """
    
    for subject in performance_insights:
        subject_CI = {}

        # Collect insights per chapter for that subject
        for chapter, data in performance_insights[subject].items():
            subject_CI[chapter] = {
                "chapter_insights": data.get("Chapter Insights", []),
                "topic_insights": data.get("Topic Insights", {})
            }
        # Convert SWOT insights into DataFrame
        ci_df = pd.DataFrame([
            {
                "chapter": chapter,
                "chapter_insights": insights["chapter_insights"],
                "topic_insights": insights["topic_insights"]
            }
            for chapter, insights in subject_CI.items()
        ])
        # Convert performance graph into DataFrame
        subject_PT = performance_graph.get(subject, {})
        pt_df = pd.DataFrame([
            {
                "chapter": chapter,
                "chapter_accuracy": details.get("chapter_accuracy", {}),
                "topics": details.get("topics", {})
            }
            for chapter, details in subject_PT.items()
        ])

        # Save to DB
        save_performance_metric(user_id, class_id, subject, "CI", ci_df)
        save_performance_metric(user_id, class_id, subject, "PT", pt_df)
    logger.info(f"✅ Performance data stored for {user_id} | {class_id} |")
    #print(f"✅ Performance data stored for {user_id} | {class_id} |")
