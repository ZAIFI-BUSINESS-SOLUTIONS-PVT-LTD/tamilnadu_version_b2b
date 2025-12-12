from exam.graph_utils.retrieve_performance_data import get_overview_data
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
import json
import concurrent.futures   
import re
from exam.llm_call.prompts import performance_prompt as base_prompt
import logging
import sentry_sdk
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)

def parse_questions(text):
    """Extract structured questions from the text using regex"""
    # Use regex to find the first occurrence of a JSON-like structure
    text = re.sub(r"^'''\s*json\s*", "", text)  # Remove ''' json from start
    text = re.sub(r"\s*'''$", "", text)  # Remove ''' from end
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No valid JSON block found in response!")

    json_text = match.group().strip()  # Extract and clean

    # Try parsing JSON
    parsed_json = json.loads(json_text)

    return parsed_json


@traceable()
def generate_perfomance_data(db_name):

    performance_graph, performance_data = get_overview_data(db_name)


    # 🔁 Gemini processing per subject
    def process(subject, data):
        try:
            subject_prompt = base_prompt + "\n\n" + json.dumps(data, indent=2)

            for _ in range(10):  # Retry max 10 times
                result = call_gemini_api_with_rotation(subject_prompt, return_structured=True)

                # Normalize result to plain text
                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error: code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                try:
                    insights = parse_questions(response)
                    return subject, insights
                except Exception as e:
                    logger.warning(f"⚠️ JSON parser failed for {subject}: {e}. Retrying...")
                    #print(f"⚠️ JSON parser failed for {subject}: {e}. Retrying...")
            logger.error(f"❌ Failed to parse after retries: {subject}")
            #print(f"❌ Failed to parse after retries: {subject}")
            return subject, {}

        except Exception as e:
            logger.exception(f"❌ Error while generating performance for {subject}: {e}")
            #print(f"❌ Error while generating performance for {subject}: {e}")
            return subject, {}

    # 🚀 Run parallel processing
    results = {}
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_to_subject = {
            executor.submit(process, subj, data): subj
            for subj, data in performance_data.items()
            }
        for future in concurrent.futures.as_completed(future_to_subject):
            subject = future_to_subject[future]
            try:
                _, insights = future.result()
                results[subject] = insights
            except Exception as e:
                logger.exception(f"❌ Failed processing {subject}: {e}")
                #print(f"❌ Failed processing {subject}: {e}")
                results[subject] = {}
    performance_insights = results

    return performance_graph, performance_insights

  