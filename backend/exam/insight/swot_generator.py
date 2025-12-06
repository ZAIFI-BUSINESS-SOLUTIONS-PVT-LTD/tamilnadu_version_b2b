from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from concurrent.futures import ThreadPoolExecutor, as_completed
from exam.llm_call.prompts import swot_prompts as prompts
from exam.llm_call.prompts import swot_test_prompts as t_prompts
from exam.models.swot import SWOT
import re

from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager
import logging
import sentry_sdk
from exam.llm_call.decorators import traceable


logger = logging.getLogger(__name__)

# --------------------- API Call Helper ---------------------
@traceable()
def extract_insights(data, prompt, max_retries=5):
    """
    Extract insights from metric data using LLM.
    Dynamically determines the number of subjects from the data.
    """
    # Determine subjects from the data
    subjects = []
    if isinstance(data, dict):
        subjects = list(data.keys())
    
    # Build dynamic output format based on actual subjects
    subject_format = "\n    ".join([f'"{subject}": [<insight 1>, <insight 2>],' for subject in subjects])
    if subject_format:
        subject_format = subject_format.rstrip(',')  # Remove trailing comma
    
    full_prompt = prompt + f"""
    
output format (JSON):
{{
    {subject_format}
}}

- Stick to the output format.
- Never return NULL.
- Ensure that all subjects present in the data are included ({', '.join(subjects)}).
- Don't mention Insight1 and Insight2, just give it as strings
- Each Insights word count should be strictly between 8 to 12.
""" + str(data)
    for attempt in range(1, max_retries + 1):
        response = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash")
        
        stripped_response = response.strip()

        # Try extracting JSON part if extra content exists
        if not (stripped_response.startswith("{") and stripped_response.endswith("}")):
            start = stripped_response.find("{")
            end = stripped_response.rfind("}") + 1
            if start != -1 and end != -1:
                stripped_response = stripped_response[start:end]

        try:
            insights_json = json.loads(stripped_response)
            return insights_json  # Success
        except Exception as e:
            logger.exception(f"Attempt {attempt} failed: {e}")
            #print(f"Attempt {attempt} failed: {e}")





# --------------------- Main Execution ---------------------
@traceable()
def generate_all_test_swot_with_AI(db_name):
    from exam.graph_utils.retrieve_swot_data_cumulative import (
    best_topics, improvement_over_time, strongest_question_type, most_challenging_topics,
    weakness_over_time, low_retention_topics, practice_recommendation, missed_opportunities,
    rapid_learning, recurring_mistake_conceptual_gap, weakness_on_high_impact, inconsistent_performance)
    # --------------------- Neo4j Manager ---------------------
    kg_manager = KnowledgeGraphManager(database_name=db_name)
    try:
        # Each metric function returns processed data for (typically) four subjects.
        all_metric_results = {
            "TS_BPT": best_topics(kg_manager),
            # "TS_IOT": improvement_over_time(kg_manager),
            # "TS_SQT": strongest_question_type(kg_manager),
            "TW_MCT": most_challenging_topics(kg_manager),
            # "TW_WOT": weakness_over_time(kg_manager),
            # "TW_LRT": low_retention_topics(kg_manager),
            # "TO_PR": practice_recommendation(kg_manager),
            # "TO_MO": missed_opportunities(kg_manager),
            "TO_RLT": rapid_learning(kg_manager),
            # "TT_RMCG": recurring_mistake_conceptual_gap(kg_manager),
            # "TT_WHIT": weakness_on_high_impact(kg_manager),
            # "TT_IP": inconsistent_performance(kg_manager)
        }
        
        insights_by_metric = {}
        with ThreadPoolExecutor() as executor:
            future_to_metric = {
                executor.submit(extract_insights, metric_data, prompts[metric_key]): metric_key
                for metric_key, metric_data in all_metric_results.items()
            }
            for future in as_completed(future_to_metric):
                metric_key = future_to_metric[future]
                try:
                    # Now each metric returns a dictionary of insights for all subjects
                    insights_by_metric[metric_key] = future.result()
                except Exception as e:
                    insights_by_metric[metric_key] = f"Error: {e}"
        return insights_by_metric
        
    finally:
        kg_manager.close()

@traceable()
def generate_swot_data_with_AI(db_name, test_num):
    from exam.graph_utils.retrieve_swot_data import (best_topic_analysis, improvement_over_time_analysis,
    inconsistent_performance_analysis, weakness_on_high_impact_analysis,low_retention_rate_analysis,
    rapid_learning_analysis, missed_opportunities_analysis, most_challenging_topic_analysis,
    recurring_mistake_conceptual_gap_analysis, practice_recommendation_analysis, strongest_question_type_analysis,
    weakness_over_time_analysis)
    # Connection parameters and test name
    kg_manager = KnowledgeGraphManager(database_name=db_name)
    test_name = test_name = f"Test{test_num}"
    
    try:
        # Run analysis functions to generate metric data
        results = {}
        results["best_topic"] = best_topic_analysis(kg_manager, test_name)
        # results["improvement_over_time"] = improvement_over_time_analysis(kg_manager, test_name)
        # results["inconsistent_performance"] = inconsistent_performance_analysis(kg_manager, test_name)
        # results["low_retention_rate"] = low_retention_rate_analysis(kg_manager, test_name)
        # results["missed_opportunities"] = missed_opportunities_analysis(kg_manager, test_name)
        results["most_challenging_topic"] = most_challenging_topic_analysis(kg_manager, test_name)
        # results["practice_recommendation"] = practice_recommendation_analysis(kg_manager, test_name)
        results["rapid_learning_topic"] = rapid_learning_analysis(kg_manager, test_name)
        # results["recurring_mistake_conceptual_gap"] = recurring_mistake_conceptual_gap_analysis(kg_manager, test_name)
        # results["strongest_question_type"] = strongest_question_type_analysis(kg_manager, test_name)
        # results["weakness_on_high_impact"] = weakness_on_high_impact_analysis(kg_manager, test_name)
        # results["weakness_over_time"] = weakness_over_time_analysis(kg_manager, test_name)
        
        # Map metric keys to analysis result keys and prompts
        metric_prompt_mapping = {
            "TS_BPT": ("best_topic", t_prompts["SS_BPT"]),
            # "TS_IOT": ("improvement_over_time", t_prompts["SS_IOT"]),
            # "TS_SQT": ("strongest_question_type", t_prompts["SS_SQT"]),
            "TW_MCT": ("most_challenging_topic", t_prompts["SW_MCT"]),
            # "TW_WOT": ("weakness_over_time", t_prompts["SW_WOT"]),
            # "TW_LRT": ("low_retention_rate", t_prompts["SW_LRT"]),
            # "TO_PR": ("practice_recommendation", t_prompts["SO_PR"]),
            # "TO_MO": ("missed_opportunities", t_prompts["SO_MO"]),
            "TO_RLT": ("rapid_learning_topic", t_prompts["SO_RLT"]),
            # "TT_RMCG": ("recurring_mistake_conceptual_gap", t_prompts["ST_RMCG"]),
            # "TT_WHIT": ("weakness_on_high_impact", t_prompts["ST_WHIT"]),
            # "TT_IP": ("inconsistent_performance", t_prompts["ST_IP"])
        }
        
        insights_by_metric = {}
        insights_by_metric = {}
        with ThreadPoolExecutor() as executor:
            future_to_metric = {
                executor.submit(extract_insights, results[analysis_key], prompt): metric_key
                for metric_key, (analysis_key, prompt) in metric_prompt_mapping.items()
            }
            for future in as_completed(future_to_metric):
                metric_key = future_to_metric[future]
                try:
                    insights_by_metric[metric_key] = future.result()
                except Exception as e:
                    logger.exception(f"Error for swot data: {e}")
                    #print(f"Error for swot data: {e}")
        
        # For example, print the insight for subject 'Botany' from the SW_LRT metric
        return insights_by_metric
        
    finally:
        kg_manager.close()

def generate_swot_data(db_name, test_num):
    from exam.graph_utils.topic_swot import (best_topic_analysis, improvement_over_time_analysis,
    inconsistent_performance_analysis, weakness_on_high_impact_analysis,low_retention_rate_analysis,
    rapid_learning_analysis, missed_opportunities_analysis, most_challenging_topic_analysis,
    recurring_mistake_conceptual_gap_analysis, practice_recommendation_analysis, strongest_question_type_analysis,
    weakness_over_time_analysis)
    # Connection parameters and test name
    kg_manager = KnowledgeGraphManager(database_name=db_name)
    test_name = f"Test{test_num}"

    try:
        metric_prompt_mapping = {
            "TS_BPT": best_topic_analysis(kg_manager, test_name),
            "TS_IOT": improvement_over_time_analysis(kg_manager, test_name),
            "TS_SQT": strongest_question_type_analysis(kg_manager, test_name),
            "TW_MCT": most_challenging_topic_analysis(kg_manager, test_name),
            "TW_WOT": weakness_over_time_analysis(kg_manager, test_name),
            "TW_LRT": low_retention_rate_analysis(kg_manager, test_name),
            "TO_PR": practice_recommendation_analysis(kg_manager, test_name),
            "TO_MO": missed_opportunities_analysis(kg_manager, test_name),
            "TO_RLT": rapid_learning_analysis(kg_manager, test_name),
            "TT_RMCG": recurring_mistake_conceptual_gap_analysis(kg_manager, test_name),
            "TT_WHIT": weakness_on_high_impact_analysis(kg_manager, test_name),
            "TT_IP": inconsistent_performance_analysis(kg_manager, test_name)
        }
        
        return metric_prompt_mapping
        
    finally:
        kg_manager.close()


def generate_all_test_swot(db_name):
    from exam.graph_utils.topic_swot_cumulative import (
    best_topics, improvement_over_time, strongest_question_type, most_challenging_topics,
    weakness_over_time, low_retention_topics, practice_recommendation, missed_opportunities,
    rapid_learning, recurring_mistake_conceptual_gap, weakness_on_high_impact, inconsistent_performance)

    # --------------------- Neo4j Manager ---------------------
    kg_manager = KnowledgeGraphManager(database_name=db_name)
    try:
        # Each metric function returns processed data for (typically) four subjects.
        all_metric_results = {
            "TS_BPT": best_topics(kg_manager),
            "TS_IOT": improvement_over_time(kg_manager),
            "TS_SQT": strongest_question_type(kg_manager),
            "TW_MCT": most_challenging_topics(kg_manager),
            "TW_WOT": weakness_over_time(kg_manager),
            "TW_LRT": low_retention_topics(kg_manager),
            "TO_PR": practice_recommendation(kg_manager),
            "TO_MO": missed_opportunities(kg_manager),
            "TO_RLT": rapid_learning(kg_manager),
            "TT_RMCG": recurring_mistake_conceptual_gap(kg_manager),
            "TT_WHIT": weakness_on_high_impact(kg_manager),
            "TT_IP": inconsistent_performance(kg_manager)
        }
        
        return all_metric_results
        
    finally:
        kg_manager.close()



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




def Generate_SWOT_educator(class_id, test_num):
    """
    Generates SWOT insights for educators based on class ID and test number.
    Args:
        class_id (str): The ID of the class.
        test_num (int, optional): The test number. If None, fetches cumulative data.
    Returns:
        dict: A dictionary containing SWOT insights for each subject.
    """

    try:
        
        
        # ✅ Get all SWOT records for the class
        swot_records = SWOT.objects.filter(class_id=class_id, swot_parameter='swot', test_num=test_num)

        # ✅ Accumulate data
        swot_aggregate = defaultdict(lambda: defaultdict(list))  # metric → subject → [entries]

        for record in swot_records:
            try:
                student_data = json.loads(record.swot_value)  # all metrics
                for metric, subject_map in student_data.items():
                    for subject, insights in subject_map.items():
                        swot_aggregate[metric][subject].extend(insights)
            except Exception as e:
                logger.warning(f"⚠️ Error parsing SWOT record: {e}")
                #print(f"⚠️ Error parsing SWOT record: {e}")
                continue

        # ✅ Same Gemini aggregation logic per metric per subject
        def gemini_aggregate(insight_list, label):
            if not insight_list:
                return []

            prompt = f"""
You are an educational analyst summarizing student performance for subject-wide SWOT categories.

Based on the following insights under "{label}", generate exactly 2 clear, teacher-facing bullet points.

- Be specific, short, and actionable.
- Output a valid JSON list of 2 strings only.

Insights:
{json.dumps(insight_list, indent=2)}
"""
            response = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash")
            while not response:
                response = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash")
            cleaned = clean_gemini_json_block(response)
            if not cleaned or not isinstance(cleaned, list):
                retry_response = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash")
                cleaned = clean_gemini_json_block(retry_response)

            return cleaned[:2] if isinstance(cleaned, list) else []

        # ✅ Reuse your metric naming structure
        swot_final = {}
        for metric, subjects in swot_aggregate.items():
            swot_final[metric] = {}
            for subject, insights in subjects.items():
                swot_final[metric][subject] = gemini_aggregate(insights, f"{metric} - {subject}")

        # ✅ Return same structure as student SWOT entry (json.dumps ready)
        return swot_final  

    except Exception as e:
        logger.exception(f"❌ Error aggregating SWOT for educator: {e}")
        #print(f"❌ Error aggregating SWOT for educator: {e}")
        return None
