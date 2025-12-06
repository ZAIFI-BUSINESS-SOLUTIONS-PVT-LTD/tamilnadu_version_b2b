from exam.graph_utils.calculate_metrics import calculate_metrics
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.graph_utils.retrieve_overview_data import get_overview_data
import json
import re
from exam.models.educator import Educator
from collections import defaultdict
from exam.models.overview import Overview
from exam.models.test import Test
from exam.llm_call.prompts import overview_prompts as prompts
import logging
import sentry_sdk
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)

@traceable()
def extract_insights(data, prompt):
    full_prompt = prompt + """
output format:
"string1"
"string2"
"string3"

- Each line must be a separate string.
- Stick strictly to the format.
- Do not return NULL.
""" + str(data)

    response = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash")

    # Split by lines safely
    lines = response.strip().split("\n")

    # Clean quotes and strip whitespace
    insights = [line.strip().strip('"').strip("'") for line in lines if line.strip()]

    return insights[:3]  # Return top 3 insights only


@traceable()
def Generate_overview_data(db_name):
    # Fetch base metrics
    op, tt, ir, cv = calculate_metrics(db_name)
    metrics = {
        "OP": op,
        "TT": tt,
        "IR": ir,
        "CS": cv
}

    # Fetch dashboard data
    KS_data, AI_data, QR_data, CV_data, PT, SA = get_overview_data(db_name)

    # Define prompts
    

    # Generate insights
    insights = {
        "KS": extract_insights(KS_data, prompts["KS"]),
        "AI": extract_insights(AI_data, prompts["AI"]),
        "QR": extract_insights(QR_data, prompts["QR"]),
        "CV": extract_insights(CV_data, prompts["CV"]),
    }

    return metrics, insights, PT, SA


def clean_gemini_json_block(response):
    """Cleans Gemini's markdown-wrapped or stringified JSON list output."""
    if isinstance(response, str):
        match = re.search(r'```(?:json)?\s*(\[\s*.*?\s*\])\s*```', response, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
        try:
            return json.loads(response)
        except:
            return []
    elif isinstance(response, list):
        return response
    return []


@traceable()
def Generate_overview_data_educator(class_id):
    """
    Generates overview data for educators based on class ID.
    Args:
        class_id (str): The ID of the class.
    Returns:
        tuple: A tuple containing aggregated metrics, insight key map, key insights data, and educator email.
    """

    try:
        # ✅ Educator info
        educator = Educator.objects.filter(class_id=class_id).first()
        if not educator:
            logger.error("Educator not found for this class ID.")
            raise Exception("Educator not found for this class ID.")
        
        email = educator.email

        # ✅ Ltotal test taken (TT)
        test_count = Test.objects.filter(class_id=class_id).count()


        # ✅ Overview data
        records = Overview.objects.filter(class_id=class_id)

        # ✅ Metrics and insights aggregation
        metrics = defaultdict(list)
        insight_lists = {
            'KS': [],
            'AI': [],
            'QR': [],
            'CV': []
        }

        for record in records:
            if hasattr(record, 'metric_name') and hasattr(record, 'metric_value'):
                name = record.metric_name
                val = record.metric_value

                if name in ['OP', 'IR', 'CS']:
                    try:
                        metrics[name].append(float(val))
                    except:
                        pass  # skip invalid

                elif name in insight_lists:
                    try:
                        parsed = json.loads(val)
                        if isinstance(parsed, list):
                            insight_lists[name].extend(parsed)
                    except:
                        pass  # skip malformed insights

        # ✅ Metric Aggregates
        aggregated_metrics = {
            'OP': round(sum(metrics['OP']) / len(metrics['OP']), 2) if metrics['OP'] else None,
            'IR': round(sum(metrics['IR']) / len(metrics['IR']), 2) if metrics['IR'] else None,
            'CS': round(sum(metrics['CS']) / len(metrics['CS']), 2) if metrics['CS'] else None,
            'TT': test_count
        }

        # ✅ Gemini summarizer with retry
        def gemini_aggregate(insight_list, label):
            if not insight_list:
                return []

            prompt = f"""
You are an educational analyst summarizing class-wide student performance for teachers.

Based on the following student insights under "{label}", generate exactly 3 sharply focused, educator-facing bullet points.

- Avoid long paragraphs.
- Be direct, crisp, and insightful.
- Return only a valid JSON list of 3 strings. No intro, no conclusion. No code blocks.

Insights:
{json.dumps(insight_list, indent=2)}
"""
            response = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash")
            cleaned = clean_gemini_json_block(response)

            if not cleaned or not isinstance(cleaned, list) or len(cleaned) < 1:
                logger.warning(f"⚠️ Gemini response invalid for {label}, retrying...")
                #print(f"⚠️ Gemini response invalid for {label}, retrying...")
                retry_response = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash")
                cleaned = clean_gemini_json_block(retry_response)

            return cleaned[:3] if isinstance(cleaned, list) else []

        # ✅ Final insights per category
        keyInsightsData = {
            "keyStrengths": gemini_aggregate(insight_lists['KS'], "Key Strengths"),
            "areasForImprovement": gemini_aggregate(insight_lists['AI'], "Areas for Improvement"),
            "quickRecommendations": gemini_aggregate(insight_lists['QR'], "Quick Recommendations"),
            "yetToDecide": gemini_aggregate(insight_lists['CV'], "Conceptual Variability"),
        }

        insight_key_map = {
            "keyStrengths": "KS",
            "areasForImprovement": "AI",
            "quickRecommendations": "QR",
            "yetToDecide": "CV"
        }

        return aggregated_metrics, insight_key_map,keyInsightsData, email
    
    except Exception as e:
        logger.exception(f"❌ Error updating teacher dashboard: {str(e)}")
        #print(f"❌ Error updating teacher dashboard: {str(e)}")
        return None