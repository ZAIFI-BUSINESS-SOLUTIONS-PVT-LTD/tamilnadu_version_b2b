import google.generativeai as genai
import time
import os
import base64
from requests.exceptions import RequestException
import logging
from exam.llm_call.decorators import trace_api_call
from exam.llm_call.decorators import get_trace_context

# Modern LangSmith tracing via @traceable decorator.
# LangSmith tracing is auto-enabled when LANGCHAIN_TRACING_V2=true is set.
# No manual tracer instantiation needed — langsmith package handles it.
try:
    from langsmith import traceable
    LANGSMITH_AVAILABLE = True
except ImportError:
    LANGSMITH_AVAILABLE = False
    # Provide a no-op decorator fallback so @traceable() doesn't break code
    def traceable(*args, **kwargs):
        def decorator(func):
            return func
        return decorator if not args else decorator(args[0])

logger = logging.getLogger(__name__)


RETRIES = 10  # Number of retries per key
INITIAL_DELAY = 1  # Initial backoff delay in seconds
EXPONENTIAL_BACKOFF = True  # Toggle for exponential backoff
MAX_DELAY = 60  # Max delay before retrying
MODEL_FAILURE_THRESHOLD = 3  # Number of model-unavailable errors before switching to fallback
DEFAULT_FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
]
MODEL_UNAVAILABLE_PATTERNS = [
    "model not available",
    "Model not found",
    "is not available",
    "does not exist",
    "404",
    "410",
    "503",
]
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

@traceable(name="call_gemini_api")
def call_gemini_api(prompt: str,
                    model_name: str = "gemini-2.5-flash", images = None) -> str:
    """Calls the Gemini API with a given prompt and returns the raw text response.
    
    LangSmith tracing is automatically enabled when LANGCHAIN_TRACING_V2=true env var is set.
    The @traceable decorator will capture this function's execution and send traces to LangSmith.
    """
    # Direct call to google.generativeai (LangSmith auto-traces via @traceable decorator)
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
# Import semaphore from analysis_generator to enforce global LLM concurrency limit
try:
    from exam.utils.analysis_generator import _llm_semaphore
except ImportError:
    import threading
    _llm_semaphore = threading.Semaphore(6)  # Fallback if not yet defined

@trace_api_call(user_id="user1", user_type="student")
def call_gemini_api_with_rotation(prompt: str,
                    model_name: str = "gemini-2.5-flash", 
                    images = None,
                    fallback_models: list = None) -> str:
    """
    Attempts up to RETRIES * len(API_KEYS) calls with API key rotation and model fallback.
    
    If a model becomes unavailable (after MODEL_FAILURE_THRESHOLD consecutive failures),
    automatically switches to fallback models while continuing key rotation.
    
    Args:
        prompt: The prompt to send to the model
        model_name: Primary model to use (default: gemini-2.5-flash)
        images: Optional images to include in the request
        fallback_models: List of fallback models to try if primary fails (default: DEFAULT_FALLBACK_MODELS)
    
    Returns:
        Model response text, or empty string if all attempts fail
    """
    # Acquire semaphore to limit global LLM concurrency
    with _llm_semaphore:
        return _call_gemini_api_with_rotation_impl(prompt, model_name, images, fallback_models)

def _call_gemini_api_with_rotation_impl(prompt: str, model_name: str, images, fallback_models: list) -> str:
    """Internal implementation of call_gemini_api_with_rotation (wrapped by semaphore)"""
    if fallback_models is None:
        fallback_models = DEFAULT_FALLBACK_MODELS.copy()
    
    # Ensure primary model is first in the fallback list
    if model_name not in fallback_models:
        fallback_models = [model_name] + fallback_models
    elif fallback_models[0] != model_name:
        fallback_models = [model_name] + [m for m in fallback_models if m != model_name]
    
    total_attempts = RETRIES * len(API_KEYS)
    attempt_count = 0
    backoff_stage = 0  # Track exponential backoff increments
    model_failures = {}  # Track consecutive failures per model
    current_model_index = 0  # Track which model in fallback list we're using
    current_model = fallback_models[current_model_index]

    def is_model_unavailable_error(error_msg: str) -> bool:
        """Check if error message indicates model unavailability"""
        error_str = str(error_msg).lower()
        return any(pattern.lower() in error_str for pattern in MODEL_UNAVAILABLE_PATTERNS)

    while attempt_count < total_attempts:
        api_key = get_next_key()
        try:
            configure_genai_for_key(api_key)
            response, usage = call_gemini_api(prompt, current_model, images)
            
            # Success - reset failure counter for this model
            model_failures[current_model] = 0
            logger.info(f"✅ Successfully called model '{current_model}' with key index {current_key_index}")
            return response

        except RequestException as e:  # Network-related errors
            attempt_count += 1
            logger.error(f"[Attempt {attempt_count}/{total_attempts}] Network error with Key={api_key}: {e}")
            # Network errors don't count toward model failures - just retry with backoff
            delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
            backoff_stage += 1
            time.sleep(delay)

        except Exception as e:  # Handles API exhaustion, model unavailability, or other failures
            attempt_count += 1
            error_msg = str(e)
            logger.error(f"[Attempt {attempt_count}/{total_attempts}] Model '{current_model}' Key={api_key} Error: {e}")

            # Check if this is a model-unavailable error
            if is_model_unavailable_error(error_msg):
                # Increment failure counter for current model
                model_failures[current_model] = model_failures.get(current_model, 0) + 1
                logger.warning(f"⚠️ Model '{current_model}' unavailable error detected. Failure count: {model_failures[current_model]}/{MODEL_FAILURE_THRESHOLD}")
                
                # If threshold reached, switch to next fallback model
                if model_failures[current_model] >= MODEL_FAILURE_THRESHOLD:
                    old_model = current_model
                    current_model_index += 1
                    
                    # Check if we have more fallback models available
                    if current_model_index < len(fallback_models):
                        current_model = fallback_models[current_model_index]
                        logger.warning(f"🔄 Switching from '{old_model}' to fallback model '{current_model}' after {MODEL_FAILURE_THRESHOLD} failures")
                        # Reset failure counter for new model and try immediately (don't count as retry)
                        model_failures[current_model] = 0
                        attempt_count -= 1  # Don't count this switch as an attempt
                        continue  # Try immediately with new model, same key
                    else:
                        logger.error(f"❌ All fallback models exhausted. No more models to try.")
                        # Continue with backoff in case it's temporary
                
                # Apply backoff before next attempt
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                time.sleep(delay)
            
            # If resource exhausted (429) or quota errors, apply backoff
            elif "Resource has been exhausted" in error_msg or "429" in error_msg:
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                logger.warning(f"⚠️ Resource limit hit. Sleeping {delay}s before retrying...")
                time.sleep(delay)
            else:
                # Generic error handling with incremental backoff
                delay = min(INITIAL_DELAY * (2 ** backoff_stage), MAX_DELAY) if EXPONENTIAL_BACKOFF else INITIAL_DELAY
                backoff_stage += 1
                logger.warning(f"⏳ Encountered an error. Retrying after {delay}s...")
                time.sleep(delay)
    
    logger.warning("[call_gemini_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    print("[call_gemini_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    return ""  # Return empty response if all attempts fail

