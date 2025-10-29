from mistralai import DocumentURLChunk, Mistral
import json
import os
from requests.exceptions import RequestException
from django.core.files.storage import default_storage
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


RETRIES = 10  # Number of retries per key
INITIAL_DELAY = 10  # Initial backoff delay in seconds
EXPONENTIAL_BACKOFF = True  # Toggle for exponential backoff
MAX_DELAY = 100  # Max delay before retrying
API_KEYS = os.getenv("MISTRAL_API_KEYS", "").split(",")

if not API_KEYS:
    raise ValueError("No API keys provided.")

current_key_index = 0  # Tracks which API key is being used


def get_next_key():
    """Returns the next API key in a round-robin manner."""
    global current_key_index
    key = API_KEYS[current_key_index]
    current_key_index = (current_key_index + 1) % len(API_KEYS)
    return key

def call_mistral_ocr_api(pdf_file,api_key):
    """Calls the Gemini API with a given prompt and returns the raw text response."""
    # Upload PDF file to Mistral's OCR service
    client = Mistral(api_key=api_key)
    assert default_storage.exists(pdf_file)
    with default_storage.open(pdf_file, 'rb') as f:
        uploaded_file = client.files.upload(
            file={
                "file_name": Path(pdf_file).stem,
                "content": f.read(),
            },
            purpose="ocr",
        )
    signed_url = client.files.get_signed_url(file_id=uploaded_file.id, expiry=1)
    response = client.ocr.process(
        document=DocumentURLChunk(document_url=signed_url.url),
        model="mistral-ocr-latest",
        include_image_base64=True
    )
    # Convert response to JSON format
    response_dict = json.loads(response.model_dump_json())
    logger.info("ocr done")
    #print("ocr done")
    data = json.dumps(response_dict, indent=4)
    return data
    

def call_mistrall_ocr_api_with_rotation(pdf_file):
    """
    Attempts up to RETRIES * len(API_KEYS) calls.
    Each attempt picks the next key in a round-robin manner.
    If resource exhausted (or 429) or any error occurs, it does exponential backoff, then tries the next key.
    """
    total_attempts = RETRIES * len(API_KEYS)
    attempt_count = 0

    while attempt_count < total_attempts:
        api_key = get_next_key()
        try:
            response = call_mistral_ocr_api(pdf_file, api_key)
            return response  # Successful API call

        except RequestException as e:  # Network-related errors
            logger.error(f"[Attempt {attempt_count + 1}/{total_attempts}] Network error with Key={api_key}: {e}")
            #print(f"[Attempt {attempt_count + 1}/{total_attempts}] Network error with Key={api_key}: {e}")

        except Exception as e:  # Handles API exhaustion or other failures
            attempt_count += 1
            logger.error(f"[Attempt {attempt_count}/{total_attempts}] Key={api_key} Error: {e}")
            print(f"[Attempt {attempt_count}/{total_attempts}] Key={api_key} Error: {e}")
    logger.warning("[call_mistral_ocr_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    #print("[call_mistral_ocr_api_with_rotation] ❌ All attempts exhausted. Returning empty string.")
    return ""  # Return empty response if all attempts fail