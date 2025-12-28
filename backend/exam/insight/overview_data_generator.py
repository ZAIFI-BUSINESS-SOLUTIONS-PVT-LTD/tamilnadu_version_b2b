from exam.graph_utils.calculate_metrics import calculate_metrics_pg
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.graph_utils.retrieve_overview_data_pg import get_overview_data_pg
from exam.graph_utils.retrieve_action_plan_data import get_action_plan_data
from exam.graph_utils.retrieve_study_tips_data import get_study_tips_data
import json
import re
from exam.models.educator import Educator
from collections import defaultdict
from exam.models.overview import Overview
from exam.models.test import Test
from exam.llm_call.prompts import overview_prompts as prompts, action_plan_prompt, checklist_prompt, study_tips_prompt
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

    result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

    # Normalize structured result to plain text for backward compatibility
    if isinstance(result, dict):
        if result.get("ok"):
            response = result.get("response", "") or ""
        else:
            logger.warning(f"Gemini structured error: code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
            response = ""
    else:
        response = result or ""

    # Split by lines safely
    lines = response.strip().split("\n")

    # Clean quotes and strip whitespace
    insights = [line.strip().strip('"').strip("'") for line in lines if line.strip()]

    return insights[:3]  # Return top 3 insights only


@traceable()
def Generate_overview_data(db_name, student_id=None, class_id=None, test_num=None):
    # Fetch base metrics using PostgreSQL
    if student_id and class_id:
        op, tt, ir, cv = calculate_metrics_pg(student_id, class_id)
    else:
        # Fallback to default values if student/class not provided
        logger.warning("student_id or class_id not provided for metrics calculation")
        op, tt, ir, cv = 0.0, 0, 0.0, 0.0
    
    metrics = {
        "OP": op,
        "TT": tt,
        "IR": ir,
        "CS": cv
}

    # Fetch dashboard data using PostgreSQL
    if student_id and class_id:
        KS_data, AI_data, QR_data, CV_data, PT, SA = get_overview_data_pg(student_id, class_id)
    else:
        # Fallback to empty data if student/class not provided
        logger.warning("student_id or class_id not provided for overview data")
        KS_data = AI_data = QR_data = CV_data = {}
        PT = {"subjects": []}
        SA = []

    # Define prompts
    

    # Generate insights
    insights = {
        "KS": extract_insights(KS_data, prompts["KS"]),
        "AI": extract_insights(AI_data, prompts["AI"]),
        "QR": extract_insights(QR_data, prompts["QR"]),
        "CV": extract_insights(CV_data, prompts["CV"]),
    }

    # Generate Action Plan if student/class/test info provided
    action_plan = []
    checklist = []
    study_tips = []
    if student_id and class_id and test_num:
        try:
            action_plan = generate_action_plan(student_id, class_id, test_num)
        except Exception as e:
            logger.error(f"Error generating action plan: {e}", exc_info=True)
            action_plan = []
        
        try:
            checklist = generate_checklist(student_id, class_id, test_num)
        except Exception as e:
            logger.error(f"Error generating checklist: {e}", exc_info=True)
            checklist = []
        
        try:
            study_tips = generate_study_tips(student_id, class_id, test_num)
        except Exception as e:
            logger.error(f"Error generating study tips: {e}", exc_info=True)
            study_tips = []

    return metrics, insights, PT, SA, action_plan, checklist, study_tips


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
            result = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash", return_structured=True)

            # Normalize structured result
            if isinstance(result, dict):
                if result.get("ok"):
                    response = result.get("response", "") or ""
                else:
                    logger.warning(f"Gemini structured error (overview gemini_aggregate): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                    response = ""
            else:
                response = result or ""

            cleaned = clean_gemini_json_block(response)

            if not cleaned or not isinstance(cleaned, list) or len(cleaned) < 1:
                logger.warning(f"⚠️ Gemini response invalid for {label}, retrying...")
                result = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash", return_structured=True)
                if isinstance(result, dict) and result.get("ok"):
                    retry_response = result.get("response", "") or ""
                else:
                    retry_response = result if not isinstance(result, dict) else ""
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


@traceable()
def generate_action_plan(student_id, class_id, test_num):
    """
    Generate Action Plan for a student based on weak topics.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    
    Returns:
        list: Action plan steps per weak topic
    """
    try:
        # Get weak topics data from Postgres
        ap_data = get_action_plan_data(student_id, class_id, test_num)
        
        if not ap_data or 'topics' not in ap_data or not ap_data['topics']:
            logger.info(f"No weak topics found for student {student_id} - performing well")
            return []
        
        # Prepare data for LLM
        topics_for_llm = []
        for topic_data in ap_data['topics']:
            topic_info = {
                'topic': topic_data['topic'],
                'subject': topic_data['subject'],
                'accuracy': topic_data['accuracy'],
                'weighted_accuracy': topic_data['weighted_accuracy'],
                'improvement_rate': topic_data['improvement_rate'],
                'total_questions': topic_data['total_questions'],
                'wrong_questions': topic_data['wrong_questions'][:5]  # Limit to 5 wrong questions per topic
            }
            topics_for_llm.append(topic_info)
        
        # Build LLM prompt
        full_prompt = action_plan_prompt + "\n\n**Weak Topics Data**:\n" + json.dumps(topics_for_llm, indent=2)
        
        # Call Gemini with retry (structured)
        for attempt in range(3):
            try:
                result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error (action_plan): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                # Clean and parse response
                action_plan = clean_action_plan_response(response)

                if action_plan and isinstance(action_plan, list) and len(action_plan) > 0:
                    logger.info(f"✅ Generated action plan with {len(action_plan)} topics for student {student_id}")
                    return action_plan

                logger.warning(f"⚠️ Action plan response invalid (attempt {attempt + 1}), retrying...")

            except Exception as e:
                logger.warning(f"⚠️ Action plan generation attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
        
        # Fallback: return empty
        logger.error(f"❌ Failed to generate action plan after 3 attempts for student {student_id}")
        return []
        
    except Exception as e:
        logger.error(f"❌ Error in generate_action_plan: {e}", exc_info=True)
        return []


def clean_action_plan_response(response):
    """Clean and parse action plan response from Gemini"""
    if not response:
        return []
    
    # Try to extract JSON from markdown code blocks
    if isinstance(response, str):
        # Remove markdown code blocks
        response = response.strip()
        
        # Check for markdown JSON block
        match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                return validate_action_plan_structure(parsed)
            except:
                pass
        
        # Try direct JSON parse
        try:
            parsed = json.loads(response)
            return validate_action_plan_structure(parsed)
        except:
            pass
        
        # Try to find JSON array in the text
        match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                return validate_action_plan_structure(parsed)
            except:
                pass
    
    elif isinstance(response, list):
        return validate_action_plan_structure(response)
    
    return []


def validate_action_plan_structure(data):
    """Validate and normalize action plan data structure"""
    if not isinstance(data, list):
        return []
    
    validated = []
    for item in data:
        if not isinstance(item, dict):
            continue
        
        # Ensure required fields exist
        if 'topic' not in item or 'subject' not in item:
            continue
        
        # Check for 'action' field (single action item)
        action = item.get('action')
        if not action or not isinstance(action, str):
            continue
        
        validated_item = {
            'topic': item['topic'],
            'subject': item['subject'],
            'accuracy': item.get('accuracy', 0.0),
            'action': action.strip()
        }
        validated.append(validated_item)
    
    # Ensure exactly 5 items (top 5)
    return validated[:5]


@traceable()
def generate_checklist(student_id, class_id, test_num):
    """
    Generate Checklist for a student based on weak topics.
    Identifies problems and mistakes (what went wrong, not how to fix).
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    
    Returns:
        list: Checklist of 6 problem checkpoints
    """
    try:
        # Get weak topics data from Postgres (same data as action plan)
        cl_data = get_action_plan_data(student_id, class_id, test_num)
        
        if not cl_data or 'topics' not in cl_data or not cl_data['topics']:
            logger.info(f"No weak topics found for student {student_id} - performing well")
            return []
        
        # Prepare data for LLM
        topics_for_llm = []
        for topic_data in cl_data['topics']:
            topic_info = {
                'topic': topic_data['topic'],
                'subject': topic_data['subject'],
                'accuracy': topic_data['accuracy'],
                'weighted_accuracy': topic_data['weighted_accuracy'],
                'improvement_rate': topic_data['improvement_rate'],
                'total_questions': topic_data['total_questions'],
                'wrong_questions': topic_data['wrong_questions'][:5]  # Limit to 5 wrong questions per topic
            }
            topics_for_llm.append(topic_info)
        
        # Build LLM prompt
        full_prompt = checklist_prompt + "\n\n**Weak Topics Data**:\n" + json.dumps(topics_for_llm, indent=2)
        
        # Call Gemini with retry (structured)
        for attempt in range(3):
            try:
                result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error (checklist): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                # Clean and parse response
                checklist = clean_checklist_response(response)

                if checklist and isinstance(checklist, list) and len(checklist) > 0:
                    logger.info(f"✅ Generated checklist with {len(checklist)} checkpoints for student {student_id}")
                    return checklist

                logger.warning(f"⚠️ Checklist response invalid (attempt {attempt + 1}), retrying...")

            except Exception as e:
                logger.warning(f"⚠️ Checklist generation attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
        
        # Fallback: return empty
        logger.error(f"❌ Failed to generate checklist after 3 attempts for student {student_id}")
        return []
        
    except Exception as e:
        logger.error(f"❌ Error in generate_checklist: {e}", exc_info=True)
        return []


def clean_checklist_response(response):
    """Clean and parse checklist response from Gemini"""
    if not response:
        return []
    
    # Try to extract JSON from markdown code blocks
    if isinstance(response, str):
        # Remove markdown code blocks
        response = response.strip()
        
        # Check for markdown JSON block
        match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                return validate_checklist_structure(parsed)
            except:
                pass
        
        # Try direct JSON parse
        try:
            parsed = json.loads(response)
            return validate_checklist_structure(parsed)
        except:
            pass
        
        # Try to find JSON array in the text
        match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                return validate_checklist_structure(parsed)
            except:
                pass
    
    elif isinstance(response, list):
        return validate_checklist_structure(response)
    
    return []


def validate_checklist_structure(data):
    """Validate and normalize checklist data structure"""
    if not isinstance(data, list):
        return []
    
    validated = []
    for item in data:
        if not isinstance(item, dict):
            continue
        
        # Ensure required fields exist
        if 'topic' not in item or 'subject' not in item:
            continue
        
        # Check for 'problem' field (single problem checkpoint)
        problem = item.get('problem')
        if not problem or not isinstance(problem, str):
            continue
        
        validated_item = {
            'topic': item['topic'],
            'subject': item['subject'],
            'accuracy': item.get('accuracy', 0.0),
            'problem': problem.strip()
        }
        validated.append(validated_item)
    
    # Ensure exactly 6 items (top 6)
    return validated[:6]


@traceable()
def generate_study_tips(student_id, class_id, test_num):
    """
    Generate Study Tips for a student based on categorized topic performance 
    and question type analysis.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    
    Returns:
        list: Study tips with 5 practical techniques
    """
    try:
        # Get categorized topic data and question type analysis
        st_data = get_study_tips_data(student_id, class_id, test_num)
        
        if not st_data:
            logger.info(f"No study tips data available for student {student_id}")
            return []
        
        # Check if there's meaningful data
        total_topics = (len(st_data.get('strong_topics', [])) + 
                       len(st_data.get('weak_topics', [])) + 
                       len(st_data.get('moderate_topics', [])))
        
        if total_topics == 0:
            logger.info(f"No topics found for study tips generation for student {student_id}")
            return []
        
        # Prepare data for LLM
        study_tips_data = {
            'strong_topics': st_data.get('strong_topics', [])[:5],  # Top 5 strong
            'weak_topics': st_data.get('weak_topics', [])[:5],      # Top 5 weak
            'moderate_topics': st_data.get('moderate_topics', [])[:5],  # Top 5 moderate
            'question_type_analysis': st_data.get('question_type_analysis', [])
        }
        
        # Build LLM prompt
        full_prompt = study_tips_prompt + "\n\n**Student Performance Data**:\n" + json.dumps(study_tips_data, indent=2)
        
        # Call Gemini with retry (structured)
        for attempt in range(3):
            try:
                result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error (study_tips): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                # Clean and parse response
                study_tips = clean_study_tips_response(response)

                if study_tips and isinstance(study_tips, list) and len(study_tips) > 0:
                    logger.info(f"✅ Generated study tips with {len(study_tips)} tips for student {student_id}")
                    return study_tips

                logger.warning(f"⚠️ Study tips response invalid (attempt {attempt + 1}), retrying...")

            except Exception as e:
                logger.warning(f"⚠️ Study tips generation attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
        
        # Fallback: return empty
        logger.error(f"❌ Failed to generate study tips after 3 attempts for student {student_id}")
        return []
        
    except Exception as e:
        logger.error(f"❌ Error in generate_study_tips: {e}", exc_info=True)
        return []


def clean_study_tips_response(response):
    """Clean and parse study tips response from Gemini"""
    if not response:
        return []
    
    # Try to extract JSON from markdown code blocks
    if isinstance(response, str):
        # Remove markdown code blocks
        response = response.strip()
        
        # Check for markdown JSON block
        match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                return validate_study_tips_structure(parsed)
            except:
                pass
        
        # Try direct JSON parse
        try:
            parsed = json.loads(response)
            return validate_study_tips_structure(parsed)
        except:
            pass
        
        # Try to find JSON array in the text
        match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                return validate_study_tips_structure(parsed)
            except:
                pass
    
    elif isinstance(response, list):
        return validate_study_tips_structure(response)
    
    return []


def validate_study_tips_structure(data):
    """Validate and normalize study tips data structure"""
    if not isinstance(data, list):
        return []
    
    validated = []
    for item in data:
        if not isinstance(item, dict):
            continue
        
        # Ensure required fields exist
        if 'category' not in item or 'tip' not in item:
            continue
        
        # Check for required fields
        category = item.get('category')
        tip = item.get('tip')
        relevance = item.get('relevance', '')
        
        if not category or not tip or not isinstance(tip, str):
            continue
        
        validated_item = {
            'category': category.strip(),
            'tip': tip.strip(),
            'relevance': relevance.strip() if isinstance(relevance, str) else ''
        }
        validated.append(validated_item)
    
    # Ensure exactly 5 items (top 5)
    return validated[:5]
