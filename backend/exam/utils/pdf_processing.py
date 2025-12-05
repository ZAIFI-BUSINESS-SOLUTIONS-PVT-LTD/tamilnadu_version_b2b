import fitz  # PyMuPDF
import json
import re
import os
import time
from io import BytesIO
from typing import List, Dict, Any, Optional
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
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
    model = "gemini-2.0-flash"
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

# --- Chunk extraction (synchronous) ---
def extract_chunk_subtask(ocr_text, start, end, images):
    """
    Synchronous chunk extraction with retry logic.
    Used by the orchestrator for both sequential and parallel execution.
    """
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

def questions_extract(pdf_path: str, test_path: str, use_parallel=True, total_questions: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
    """
    Extracts questions from PDF using parallel chunk processing.
    
    Args:
        pdf_path: Path to the PDF file
        test_path: Directory for saving outputs
        use_parallel: If True, uses Celery group for parallel extraction; if False, sequential
    
    Returns:
        List of question dicts or None on failure
    """
    # OCR and initial setup
    all_questions = []
    images = pdf_to_images(pdf_path)
    ocr_text = call_mistrall_ocr_api_with_rotation(pdf_path)
    markdown_content = f"# OCR Result\n\n```json\n{ocr_text}\n```"
    markdown_path = os.path.join(test_path, "ocr_output.md")
    default_storage.save(markdown_path, ContentFile(markdown_content))
    logger.info(f"[QUESTION EXTRACTION] ✅ OCR data saved as Markdown at: {markdown_path}")

    # Use provided total_questions (from metadata) if available to avoid an LLM call
    if total_questions is not None:
        N = int(total_questions)
        logger.info(f"[QUESTION EXTRACTION] 📄 Using metadata total questions: {N}")
    else:
        N = get_total_questions(images)
        logger.info(f"[QUESTION EXTRACTION] 📄 Total questions (LLM): {N}")
    
    # Calculate chunk boundaries
    chunk_size = int(N / 4)
    chunks = []
    for idx in range(4):
        start = 1 + (idx * chunk_size)
        # Last chunk takes any remaining questions
        end = N if idx == 3 else start + chunk_size - 1
        chunks.append((start, end, idx))

    logger.info(f"[QUESTION EXTRACTION] 📊 Chunk boundaries: {[(s, e) for s, e, _ in chunks]}")

    # We'll attempt extraction up to `max_attempts` times if the exact question count isn't met.
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        all_questions = []

        if use_parallel:
            # Parallel extraction using ThreadPoolExecutor
            logger.info(f"[QUESTION EXTRACTION] 🚀 Attempt {attempt}/{max_attempts} - Using parallel chunk extraction")
            from concurrent.futures import ThreadPoolExecutor, as_completed

            chunk_results = [None] * 4  # Preserve order

            with ThreadPoolExecutor(max_workers=4) as executor:
                future_to_chunk = {
                    executor.submit(extract_chunk_subtask, ocr_text, start, end, images): (start, end, idx)
                    for start, end, idx in chunks
                }

                for future in as_completed(future_to_chunk):
                    start, end, idx = future_to_chunk[future]
                    try:
                        questions = future.result()
                        chunk_results[idx] = questions
                        logger.info(f"[QUESTION EXTRACTION] ✅ Chunk {idx + 1}/4 completed (Q{start}-Q{end}): {len(questions.get('questions', []))} questions")
                    except Exception as e:
                        logger.error(f"[QUESTION EXTRACTION] ❌ Chunk {idx + 1}/4 failed (Q{start}-Q{end}): {e}")
                        chunk_results[idx] = None

            # Merge results in order
            for idx, result in enumerate(chunk_results):
                if result and 'questions' in result:
                    all_questions.extend(result['questions'])
                else:
                    logger.error(f"[QUESTION EXTRACTION] ❌ Chunk {idx + 1}/4 returned no valid results")
        else:
            # Sequential extraction (original behavior)
            logger.info(f"[QUESTION EXTRACTION] 🔄 Attempt {attempt}/{max_attempts} - Using sequential chunk extraction")
            for start, end, idx in chunks:
                questions = extract_chunk_subtask(ocr_text, start, end, images)
                logger.info(f"[QUESTION EXTRACTION] ✅ Extracted questions from {start} to {end}")
                if questions and 'questions' in questions:
                    all_questions.extend(questions["questions"])

        # Deduplicate by question_number (keep first occurrence)
        seen = set()
        deduped_questions = []
        for q in all_questions:
            qnum = q.get('question_number')
            if qnum not in seen:
                seen.add(qnum)
                deduped_questions.append(q)
            else:
                logger.warning(f"[QUESTION EXTRACTION] ⚠️ Duplicate question number {qnum} found, keeping first occurrence")

        logger.info(f"[QUESTION EXTRACTION] 📊 Attempt {attempt}/{max_attempts} - Total extracted: {len(all_questions)}, After dedup: {len(deduped_questions)}, Expected: {N}")

        # Require exact match now. If mismatch, retry up to max_attempts.
        if len(deduped_questions) == N:
            question_paper_json_path = os.path.join(test_path, "qp.json")
            json_data = json.dumps(deduped_questions, indent=4)
            default_storage.save(question_paper_json_path, ContentFile(json_data))
            logger.info(f"[QUESTION EXTRACTION] ✅ Saved {len(deduped_questions)} questions to {question_paper_json_path}")
            return deduped_questions
        else:
            logger.warning(f"[QUESTION EXTRACTION] ⚠️ Extraction count mismatch: {len(deduped_questions)}/{N} on attempt {attempt}/{max_attempts}")
            if attempt < max_attempts:
                logger.info(f"[QUESTION EXTRACTION] 🔄 Retrying extraction (attempt {attempt + 1}/{max_attempts})")
                continue
            else:
                logger.error(f"[QUESTION EXTRACTION] ❌ Extraction incomplete after {max_attempts} attempts: {len(deduped_questions)}/{N}")
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


def questions_extract_with_metadata(pdf_path: str, test_path: str, subject_ranges: list, total_questions: int) -> Optional[List[Dict[str, Any]]]:
    """
    Extract questions using admin-provided subject ranges.
    
    Args:
        pdf_path: Path to the question paper PDF
        test_path: Directory path for test files
        subject_ranges: List of dicts with 'subject', 'start', 'end' keys
        total_questions: Total expected questions
    
    Returns:
        List of question dictionaries with assigned subjects
    """
    try:
        all_questions = []
        images = pdf_to_images(pdf_path)
        ocr_text = call_mistrall_ocr_api_with_rotation(pdf_path)
        
        # Save OCR
        markdown_content = f"# OCR Result\n\n```json\n{ocr_text}\n```"
        markdown_path = os.path.join(test_path, "ocr_output.md")
        default_storage.save(markdown_path, ContentFile(markdown_content))
        logger.info(f"[METADATA EXTRACTION] ✅ OCR data saved at: {markdown_path}")
        
        # First, try extracting the entire paper once and then assign subjects by metadata ranges.
        logger.info("[METADATA EXTRACTION] ℹ️ Attempting full-paper extraction before per-range extraction")
        # Pass along metadata total_questions to avoid redundant LLM calls
        # Note: do not reference `use_parallel` here (not defined in this scope).
        # Let questions_extract use its default `use_parallel` behavior, but pass
        # through the admin-provided `total_questions` to skip the LLM counting call.
        whole_questions = questions_extract(pdf_path, test_path, total_questions=total_questions)

        if whole_questions and isinstance(whole_questions, list) and len(whole_questions) > 0:
            logger.info(f"[METADATA EXTRACTION] ✅ Full-paper extraction returned {len(whole_questions)} questions. Assigning to ranges...")

            # Build a map of question_number -> question dict (deduplicate keeping first occurrence)
            question_map = {}
            dup_count = 0
            for q in whole_questions:
                try:
                    qnum = int(q.get('question_number'))
                except Exception:
                    logger.warning(f"[METADATA EXTRACTION] ⚠️ Skipping invalid question number: {q.get('question_number')}")
                    continue
                if qnum in question_map:
                    dup_count += 1
                    logger.debug(f"[METADATA EXTRACTION] ⚠️ Duplicate question number {qnum} in full extraction; keeping first occurrence")
                    continue
                question_map[qnum] = q

            if dup_count:
                logger.warning(f"[METADATA EXTRACTION] ⚠️ Skipped {dup_count} duplicate questions from full extraction")

            assigned_questions = []
            unassigned_qnums = set(question_map.keys())

            # Assign by metadata ranges in given order
            for range_info in subject_ranges:
                subject = range_info['subject']
                start = range_info['start']
                end = range_info['end']
                expected_count = range_info.get('count') or (end - start + 1)

                qnums_in_range = sorted([qn for qn in unassigned_qnums if start <= qn <= end])
                if not qnums_in_range:
                    logger.warning(f"[METADATA EXTRACTION] ⚠️ No questions found in extracted data for {subject} range {start}-{end}")

                for qn in qnums_in_range:
                    q = question_map.get(qn)
                    if not q:
                        continue
                    q['subject'] = subject
                    assigned_questions.append(q)
                    unassigned_qnums.discard(qn)

                logger.info(f"[METADATA EXTRACTION] ✅ Assigned {len(qnums_in_range)} questions to {subject} (requested {expected_count})")

            # If there are still unassigned question numbers, log them for investigation
            if unassigned_qnums:
                logger.warning(f"[METADATA EXTRACTION] ⚠️ {len(unassigned_qnums)} questions unassigned to any subject: {sorted(unassigned_qnums)[:10]}{'...' if len(unassigned_qnums)>10 else ''}")

            # Save assigned questions
            if assigned_questions:
                question_paper_json_path = os.path.join(test_path, "qp.json")
                json_data = json.dumps(assigned_questions, indent=4)
                default_storage.save(question_paper_json_path, ContentFile(json_data))
                logger.info(f"[METADATA EXTRACTION] ✅ Saved {len(assigned_questions)}/{total_questions} assigned questions to {question_paper_json_path}")

                # Validate count
                if abs(len(assigned_questions) - total_questions) > 2:
                    logger.warning(f"[METADATA EXTRACTION] ⚠️ Question count mismatch after assignment: assigned {len(assigned_questions)}, expected {total_questions}")

                return assigned_questions
            else:
                logger.error(f"[METADATA EXTRACTION] ❌ No questions assigned after full-paper extraction; will fall back to per-range extraction")

        else:
            logger.warning("[METADATA EXTRACTION] ⚠️ Full-paper extraction failed or returned no questions; falling back to per-range extraction")

        # Fallback: Extract questions for each subject range individually
        for range_info in subject_ranges:
            subject = range_info['subject']
            start = range_info['start']
            end = range_info['end']
            
            logger.info(f"[METADATA EXTRACTION] 📄 Extracting {subject}: Q{start}-Q{end} (fallback)")
            
            questions = extract_chunk_subtask(ocr_text, start, end, images)
            
            if questions and 'questions' in questions:
                # Filter to only include question numbers within the expected range
                filtered = []
                seen_qnums = set()
                for q in questions['questions']:
                    try:
                        qnum = int(q.get('question_number'))
                    except Exception:
                        logger.warning(f"[METADATA EXTRACTION] ⚠️ Skipping question with invalid number: {q.get('question_number')}")
                        continue

                    if qnum < start or qnum > end:
                        logger.warning(f"[METADATA EXTRACTION] ⚠️ Question {qnum} out of expected range {start}-{end}; skipping")
                        continue

                    if qnum in seen_qnums:
                        logger.warning(f"[METADATA EXTRACTION] ⚠️ Duplicate question number {qnum} in {subject}; skipping duplicate")
                        continue

                    seen_qnums.add(qnum)
                    q['subject'] = subject
                    filtered.append(q)

                all_questions.extend(filtered)
                logger.info(f"[METADATA EXTRACTION] ✅ Extracted {len(filtered)} questions for {subject} (requested {end - start + 1})")
            else:
                logger.error(f"[METADATA EXTRACTION] ❌ Failed to extract {subject} questions (fallback)")
        
        if len(all_questions) > 0:
            # Save extracted questions
            question_paper_json_path = os.path.join(test_path, "qp.json")
            json_data = json.dumps(all_questions, indent=4)
            default_storage.save(question_paper_json_path, ContentFile(json_data))
            logger.info(f"[METADATA EXTRACTION] ✅ Saved {len(all_questions)}/{total_questions} questions to {question_paper_json_path}")
            
            # Validate count
            if abs(len(all_questions) - total_questions) > 2:
                logger.warning(f"[METADATA EXTRACTION] ⚠️ Question count mismatch: extracted {len(all_questions)}, expected {total_questions}")
            
            return all_questions
        else:
            logger.error(f"[METADATA EXTRACTION] ❌ No questions extracted")
            return None
            
    except Exception as e:
        logger.error(f"[METADATA EXTRACTION] ❌ Error in metadata extraction: {e}")
        return None
