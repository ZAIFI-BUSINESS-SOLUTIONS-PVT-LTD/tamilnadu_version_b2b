import fitz  # PyMuPDF
import json
import re
import os
import time
from io import BytesIO
from typing import List, Dict, Any, Optional
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from celery import shared_task
from celery.exceptions import TimeoutError
import logging

# LLM API and prompts as per your setup:
from exam.llm_call.prompts import ocr_image_prompt as ocr_prompt
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.llm_call.mistral_api import call_mistrall_ocr_api_with_rotation

logger = logging.getLogger(__name__)

class JsonParseError(Exception):
    """Raised when the JSON is malformed or cannot be loaded."""
    pass

class QuestionFieldError(Exception):
    """Raised when required question fields are missing or empty."""
    pass



# --- PDF to images ---

def pdf_to_images(pdf_path: str) -> List[BytesIO]:
    image_data_list = []
    with default_storage.open(pdf_path, 'rb') as pdf_file:
        pdf_bytes = pdf_file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_number in range(pdf_document.page_count):
            page = pdf_document.load_page(page_number)
            pix = page.get_pixmap(colorspace=fitz.csGRAY)
            img_io = BytesIO(pix.tobytes("png"))
            image_data_list.append(img_io)
    return image_data_list

# --- Parsing ---

def parse_questions_or_raise(text: str) -> Dict[str, List[Dict[str, Any]]]:
    text = re.sub(r"^'''(\s*json)?", "", text)
    text = re.sub(r"'''$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise JsonParseError("No valid JSON found in response!")
    try:
        json_text = match.group().strip()
        parsed_json = json.loads(json_text)
    except Exception as e:
        raise JsonParseError(f"Failed to load JSON: {e}")

    questions = []
    for idx, q in enumerate(parsed_json.get("questions", [])):
        qnum = int(q.get("question_number") or 0)
        question = str(q.get("question") or "").strip()
        options = q.get("options", {})
        im_desp = q.get("im_desp", None)
        # Raise for missing required fields/text/options
        if not question:
            raise QuestionFieldError(f"Missing question text at #{qnum or idx+1}")
        for opt in ("1", "2", "3", "4"):
            if opt not in options or options[opt] is None or not str(options[opt]).strip():
                raise QuestionFieldError(f"Missing or empty option {opt} in question #{qnum or idx+1}")
            options[opt] = str(options[opt]).strip()
        if im_desp is None or str(im_desp).strip().lower() in ("null", "none", ""):
            im_desp = "NULL"
        questions.append({
            "question_number": qnum if qnum else idx + 1,
            "question": question,
            "options": options,
            "im_desp": im_desp
        })
    return {"questions": questions}

# --- LLM Wrappers ---

def get_total_questions(images: List[BytesIO]) -> int:
    prompt = (
        "Count the total number of questions (every question with a question number, mostly 180/200). "
        "Return just a single integer, nothing else."
    )
    model = "gemini-2.0-flash-lite"
    response = call_gemini_api_with_rotation(prompt, model, images)
    try:
        N = int(re.search(r"\d+", response).group())
        return N
    except Exception as e:
        logger.error(f"Failed to extract question count from response: {response} ({e})")
        raise

def extract_text_from_images(images: List[BytesIO], start: int, end: int) -> str:
    prompt = f"extract from question number {start} till {end}" + ocr_prompt
    return call_gemini_api_with_rotation(prompt, "gemini-2.5-flash", images)

def extract_text_from_content(ocr: str, start: int, end: int) -> str:
    prompt = f"extract from question number {start} till {end}" + str(ocr_prompt) + ocr
    return call_gemini_api_with_rotation(prompt, "gemini-2.0-flash")

def extract_text(ocr: str, start: int, end: int, images: List[BytesIO]) -> str:
    r1 = extract_text_from_images(images, start, end)
    r2 = extract_text_from_content(ocr, start, end)
    prompt = (
        f"The questions range from number {start} to {end}.\n"
        "I have attached two OCR outputs. Generate a clean JSON with:\n"
        "- Fill any missing option/question by referring both outputs and images.\n"
        "- Group options as 1,2,3,4 (convert from a,b,c,d if needed).\n"
        "- Never return null for any option/question, use empty string ('') if unsure.\n"
        "- Every question must have its question number, text, and all four options.\n"
        "- If an image/diagram, set im_desp as string else as NULL.\n"
        "Format: { \"questions\": [ ... as shown below ... ] }\n"
        "{"
        "   \"questions\": ["
        "     {"
        "       \"question_number\": int,"
        "       \"question\": \"Question text\","
        "       \"options\": {\"1\": \"\", \"2\": \"\", \"3\": \"\", \"4\": \"\"},"
        "       \"im_desp\": \"...\""
        "     }"
        "   ]"
        "}\n"
        + r1 + "\n" + r2
    )
    return call_gemini_api_with_rotation(prompt, "gemini-2.5-flash", images)

def retry_extract_text(response: str, error: Exception) -> str:
    prompt = (
        f"Error parsing JSON: {error}\n"
        "Reprocess the following text to provide a clean JSON output as described:\n"
        f"{response}\n"
        "Expected JSON format:\n"
        "{ \"questions\": [ { \"question_number\": int, \"question\": \"\", \"options\": {\"1\": \"\", \"2\": \"\", \"3\": \"\", \"4\": \"\"}, \"im_desp\": \"...\" } ] }"
    )
    return call_gemini_api_with_rotation(prompt, "gemini-2.5-flash")

# --- Celery subtask ---

def extract_chunk_subtask(ocr_text, start, end, images):
    attempt = 0
    
    extracted_text = extract_text(ocr_text, start, end, images)
    questions = []
    while not questions:
        try:
            questions = parse_questions_or_raise(extracted_text)
            return questions
        except JsonParseError as e:
            attempt += 1
            logger.error(f"[CHUNK {start}-{end}] JSON deformity Attempt {attempt} failed: {e}")
            if attempt < 3:
                # Retry by reprocessing the output
                extracted_text = retry_extract_text(extracted_text, e)
            else:
                # On final attempt, get a fresh LLM output
                extracted_text = extract_text(ocr_text, start, end, images)
                attempt = 0
        except QuestionFieldError as e:
            logger.error(f"[CHUNK {start}-{end}] Missing fields/text error: {e}")
            # For missing question/options, no point retrying the same text: get fresh LLM output
            extracted_text = extract_text(ocr_text, start, end, images)
            attempt = 0

# --- Main orchestrator (not a Celery task) ---

def questions_extract(pdf_path: str, test_path: str) -> Optional[List[Dict[str, Any]]]:
    """
    - Launches 4 parallel chunk extraction subtasks via Celery,
    - Aggregates results as soon as each chunk finishes,
    - Retries individual chunks on TimeoutError,
    - Saves result JSON if all chunks succeed.
    """
    # OCR and initial setup
    all_questions = []
    images = pdf_to_images(pdf_path)
    ocr_text = call_mistrall_ocr_api_with_rotation(pdf_path)
    markdown_content = f"# OCR Result\n\n```json\n{ocr_text}\n```"
    markdown_path = os.path.join(test_path, "ocr_output.md")
    default_storage.save(markdown_path, ContentFile(markdown_content))
    logger.info(f"[QUESTION EXTRACTION] ✅ OCR data saved as Markdown at: {markdown_path}")

    N = get_total_questions(images)
    logger.info(f"[QUESTION EXTRACTION] 📄 Total questions: {N}")
    for i in range(1,N,int(N/4)):
        questions = []
        start=i
        end = i+(N/4)-1
        questions = extract_chunk_subtask(ocr_text, start, end, images)
        logger.info(f"Extracted questions from {start} to {end}")

        all_questions.extend(questions["questions"])

    if len(all_questions) == N:
        question_paper_json_path = os.path.join(test_path, "qp.json")
        json_data = json.dumps(all_questions, indent=4)
        default_storage.save(question_paper_json_path, ContentFile(json_data))
        logger.info(f"[QUESTION EXTRACTION] ✅ Saved extracted questions to {question_paper_json_path}")
        return all_questions
    else:
        logger.error(f"[QUESTION EXTRACTION] ❌ Extraction incomplete: {len(all_questions)}/{N}")
        return None

def get_subject_from_q_paper(pdf_path: str) -> Optional[str]:
    """
    Extracts the subject from the first page of a question paper using an LLM.
    """
    try:
        images = pdf_to_images(pdf_path)
        if not images:
            return None

        first_page_image = images[0]
        prompt = "Analyze the provided image of a question paper's first page and identify the subject. The subject is likely to be Physics, Chemistry, Botany, Zoology, or Biology. Return only the subject name as a single word."
        model = "gemini-2.0-flash-lite"
        subject = call_gemini_api_with_rotation(prompt, model, [first_page_image])

        subject = subject.strip().title()
        if subject in ["Physics", "Chemistry", "Botany", "Zoology", "Biology"]:
            return subject
        return None
    except Exception as e:
        logger.error(f"Error getting subject from question paper: {e}")
        return None
