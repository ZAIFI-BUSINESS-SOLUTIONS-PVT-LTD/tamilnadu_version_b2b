import google.generativeai as genai
import time
import os
import base64
from requests.exceptions import RequestException
import logging
from exam.llm_call.decorators import trace_api_call

logger = logging.getLogger(__name__)


RETRIES = 10  # Number of retries per key
INITIAL_DELAY = 1  # Initial backoff delay in seconds
EXPONENTIAL_BACKOFF = True  # Toggle for exponential backoff
MAX_DELAY = 60  # Max delay before retrying
API_KEYS = os.getenv("GEN_AI_API_KEYS", "").split(",")

if not API_KEYS:
    raise ValueError("No API keys provided.")

current_key_index = 0  # Tracks which API key is being used


def encode_image(image_io):
    """Encode an image for API processing"""
    image_io.seek(0)
    return base64.b64encode(image_io.read()).decode('utf-8')

def get_next_key():
    """Returns the next API key in a round-robin manner."""
    global current_key_index
    key = API_KEYS[current_key_index]
    current_key_index = (current_key_index + 1) % len(API_KEYS)
    return key

def configure_genai_for_key(api_key: str):
    """Configure the Google Gemini library with the provided API key."""
    genai.configure(api_key=api_key)

def call_gemini_api(prompt: str,
                    model_name: str = "gemini-2.0-flash-thinking-exp-01-21", images = None) -> str:
    """Calls the Gemini API with a given prompt and returns the raw text response."""

    model = genai.GenerativeModel(model_name)
    if not images:
        response = model.generate_content(prompt)
    elif images:
        encoded_images = [{"data": encode_image(img), "mime_type": "image/png"} for img in images]
        response = model.generate_content([*encoded_images, prompt])
    if hasattr(response, 'text'):
        return response.text.strip(), response.usage_metadata
    elif hasattr(response, 'candidates') and response.candidates:
        return response.candidates[0].content.parts[0].text.strip()
    return ""
@trace_api_call(user_id="user1", user_type="student")
def call_gemini_api_with_rotation(prompt: str,
                    model_name: str = "models/gemini-2.0-flash-thinking-exp-01-21", images = None) -> str:
    """
    Attempts up to RETRIES * len(API_KEYS) calls.
    Each attempt picks the next key in a round-robin manner.
    If resource exhausted (or 429) or any error occurs, it does exponential backoff, then tries the next key.
    """
    total_attempts = RETRIES * len(API_KEYS)
    attempt_count = 0
    backoff_stage = 0  # Track exponential backoff increments

    while attempt_count < total_attempts:
        api_key = get_next_key()
        try:
            configure_genai_for_key(api_key)
            response,usage = call_gemini_api(prompt,model_name,images)
            return response  # Successful API call

        except RequestException as e:  # Network-related errors
            logger.error(f"[Attempt {attempt_count + 1}/{total_attempts}] Network error with Key={api_key}: {e}")
            #print(f"[Attempt {attempt_count + 1}/{total_attempts}] Network error with Key={api_key}: {e}")

        except Exception as e:  # Handles API exhaustion or other failures
            attempt_count += 1
            logger.error(f"[Attempt {attempt_count}/{total_attempts}] Key={api_key} Error: {e}")
            #print(f"[Attempt {attempt_count}/{total_attempts}] Key={api_key} Error: {e}")

            # If resource exhausted (429) or similar, apply backoff
            if "Resource has been exhausted" in str(e) or "429" in str(e):
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                logger.warning(f"⚠️ Resource limit hit. Sleeping {delay}s before retrying...")
                #print(f"⚠️ Resource limit hit. Sleeping {delay}s before retrying...")
                time.sleep(delay)
            else:
                # Generic error handling with incremental backoff
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                logger.warning(f"⏳ Encountered an error. Retrying after {delay}s...")
                #print(f"⏳ Encountered an error. Retrying after {delay}s...")
                time.sleep(delay)
    logger.warning("[call_gemini_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    print("[call_gemini_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    return ""  # Return empty response if all attempts fail

def call_gemini_api_model_with_rotation(prompt: str,images = None) -> str:
    """
    Attempts up to RETRIES * len(API_KEYS) calls.
    Each attempt picks the next key in a round-robin manner.
    If resource exhausted (or 429) or any error occurs, it does exponential backoff, then tries the next key.
    """
    total_attempts = RETRIES * len(API_KEYS)
    attempt_count = 0
    backoff_stage = 0  # Track exponential backoff increments

    while attempt_count < total_attempts:
        api_key = get_next_key()
        try:
            fallback_models = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash-lite-001",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash"
    ]
    
            for model_name in fallback_models:
                configure_genai_for_key(api_key)
                response = call_gemini_api(prompt,model_name,images)
                return response  # Successful API call

        except RequestException as e:  # Network-related errors
            logger.error(f"[Attempt {attempt_count + 1}/{total_attempts}] Network error with Key={api_key}: {e}")
            #print(f"[Attempt {attempt_count + 1}/{total_attempts}] Network error with Key={api_key}: {e}")

        except Exception as e:  # Handles API exhaustion or other failures
            attempt_count += 1
            logger.error(f"[Attempt {attempt_count}/{total_attempts}] Key={api_key} Error: {e}")
            #print(f"[Attempt {attempt_count}/{total_attempts}] Key={api_key} Error: {e}")

            # If resource exhausted (429) or similar, apply backoff
            if "Resource has been exhausted" in str(e) or "429" in str(e):
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                logger.warning(f"⚠️ Resource limit hit. Sleeping {delay}s before retrying...")
                #print(f"⚠️ Resource limit hit. Sleeping {delay}s before retrying...")
                time.sleep(delay)
            else:
                # Generic error handling with incremental backoff
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                logger.warning(f"⏳ Encountered an error. Retrying after {delay}s...")
                #print(f"⏳ Encountered an error. Retrying after {delay}s...")
                time.sleep(delay)
    logger.warning("[call_gemini_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    #print("[call_gemini_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    return ""  # Return empty response if all attempts fail

