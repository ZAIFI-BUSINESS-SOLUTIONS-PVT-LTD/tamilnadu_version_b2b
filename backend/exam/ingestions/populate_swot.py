import json
from exam.models.swot import SWOT
import pandas as pd

def save_swot_metric(user_id, class_id,test_num, metric_name, metric_value):
    """
    Save a single performance metric into the Performance table.
    Converts lists, dicts, and DataFrames to JSON strings before saving.
    """
    if isinstance(metric_value, (pd.DataFrame)):
        metric_value = metric_value.to_dict()
        metric_value = json.loads(json.dumps(metric_value))
    elif isinstance(metric_value, (list, dict)):
        metric_value = json.loads(json.dumps(metric_value))  # Ensures clean JSON

    SWOT.objects.update_or_create(
        user_id=user_id,
        class_id=class_id,
        test_num= test_num,
        swot_parameter=metric_name,
        defaults={"swot_value": json.dumps(metric_value)}
    )