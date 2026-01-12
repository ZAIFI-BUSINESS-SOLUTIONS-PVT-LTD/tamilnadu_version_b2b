from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from concurrent.futures import ThreadPoolExecutor, as_completed
from exam.llm_call.NEET_data import chapter_list
import logging
import threading
from celery import shared_task, group, current_task
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)

# Global semaphore to limit concurrent LLM API calls across all threads/workers
# This prevents overwhelming the API when running multiple batches in parallel
_llm_semaphore = threading.Semaphore(6)  # Max 6 concurrent LLM calls


def _is_running_in_celery_task():
    """Check if we're currently executing inside a Celery task."""
    try:
        return current_task.request.id is not None
    except (AttributeError, RuntimeError):
        return False


def parse_metadata(response,subject):
    metadata_list = []
    response_blocks = response.strip().split("\n\n")
    for block in response_blocks:
        item = {}
        for line in block.split("\n"):
            if ":" in line:
                key, val = line.split(":", 1)
                item[key.strip()] = val.strip()
        
        #print(item.get("Chapter"),item.get("Topic"),item.get("Subtopic"))
        metadata_list.append({
            "Subject": subject,
            "Chapter": item.get("Chapter"),
            "Topic": item.get("Topic"),
            "Subtopic": item.get("Subtopic"),
            "TypeOfQuestion": item.get("TypeOfQuestion"),
            "QuestionNumber": item.get("QuestionNumber"),
        })
    return metadata_list




@traceable()
def infer_subject_with_gemini(questions, excluded_subjects=None):
    """
    Infers the subject (Physics, Chemistry, Botany, Zoology) from a batch of NEET questions.
    
    Args:
        questions: List of question dicts
        excluded_subjects: List of subjects to exclude from consideration (already assigned to other batches)
    """
    if excluded_subjects is None:
        excluded_subjects = []
    
    available_subjects = [s for s in ["Physics", "Chemistry", "Botany", "Zoology"] if s not in excluded_subjects]
    
    if not available_subjects:
        available_subjects = ["Physics", "Chemistry", "Botany", "Zoology"]
    
    subjects_str = ", ".join(available_subjects)
    exclusion_note = f"\nIMPORTANT: Do NOT assign {', '.join(excluded_subjects)}. Choose only from: {subjects_str}" if excluded_subjects else ""

    prompt = f"""
You are an expert NEET subject classifier. The following NEET questions belong to only **one subject**:

{subjects_str}
kindly differentiate between Botany and Zoology
if you have doubt choose based on majority
{exclusion_note}

Strictly output only the subject name — no punctuation or explanation.
- return single word as string once not for every question.
but read every questions before answering.
Here are the questions:

    """

    for q in questions:
        options_str = "\n".join([f"{idx+1}. {opt}" for idx, opt in enumerate(q['options'])])
        prompt += f"""
QuestionNumber: {q['question_number']}
Question: {q['question_text']}
Options:
{options_str}
im_desp: {q['im_desp']}
"""

    subject = None

    while not subject:
        result = call_gemini_api_with_rotation(prompt, model_name="gemini-2.5-flash", return_structured=True)

        # Normalize structured result to plain text for backward compatibility
        if isinstance(result, dict):
            if result.get("ok"):
                response = (result.get("response") or "").strip()
            else:
                logger.warning(f"Gemini structured error (subject inference): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                response = ""
        else:
            response = (result or "").strip()

        if response:
            subject = response
            if subject in available_subjects:
                return subject
            else:
                subject = infer_subject_with_gemini(questions, excluded_subjects)
                return subject
    return subject




@traceable()
def recursive_metadata_generation(batch, excluded_subjects=None, subject=None):
    """
    Detects subject, then generates structured metadata for each question.
    
    Args:
        batch: List of question dicts
        excluded_subjects: List of subjects to exclude (already assigned to other batches)
    """
    # If a subject is provided (from admin metadata), use it and skip inference.
    if subject is None:
        subject = infer_subject_with_gemini(batch, excluded_subjects)
        logger.info(f"📘 Subject detected: {subject}")
    else:
        logger.info(f"📘 Using provided subject (metadata): {subject}")
    #print(f"📘 Subject detected: {subject}")

    S_chapter_list = chapter_list.get(subject, [])

    # Quick-fix: when tests are labeled as 'Biology' we don't have a
    # dedicated chapter list in `NEET_data.py`. Treat Biology as a
    # combination of Botany + Zoology so the LLM has a valid chapter list
    # to choose from. This prevents empty/"[]" chapter outputs.
    if subject == "Biology" and not S_chapter_list:
        S_chapter_list = chapter_list.get("Botany", []) + chapter_list.get("Zoology", [])
        logger.info(f"Fallback chapter list applied for Biology: Botany+Zoology ({len(S_chapter_list)} chapters)")
    
    # Build metadata prompt
    prompt = f"""
You are a NEET question classifier. All the following questions belong to the subject: {subject}

  1. Subject
  2. Chapter (Choose one from the provided list)
  3. Topic (Choose one from the provided list)
  4. Subtopic (Even more specific breakdown, subtopic should be more granular than topics)
  5. Type of Question (Theoretical, Calculative, Application-Based, Diagram-Based, Derivation-Based, Comparative, Interpretative, Experimental/Procedural, Conceptual, Case-Based/Scenario-Based)

  example: 
Subject: physics
Chapter: Alternating Current
Topic: Resonance
Subtopic: Resonance in RLC series circuit
TypeOfQuestion: Theoretical
QuestionNumber: 0

Chapters for {subject}:
{S_chapter_list}

Use this exact format for each question:
Subject: <value>
Chapter: <value>
Topic: <value>
Subtopic: <value>
TypeOfQuestion: <value>
QuestionNumber: <value>

- Output should not be in JSON.
- Strictly return '{subject}' as the subject.
- Use chain of thought.(It is important for my life)
- never return null value.
- I'm parsing these values
- Make sure you send generate these data for all the given questions.
- question number is the primary key here.(so make sure you don't mess it up)
- Strictly choose chapter and topic from the list provided.



"""

   
    for q in batch:
        options_str = "\n".join([f"{idx+1}. {opt}" for idx, opt in enumerate(q['options'])])
        prompt += f"""
QuestionNumber: {q['question_number']}
Question: {q['question_text']}
Options:
{options_str}
im_desp: {q['im_desp']}
"""


    result = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash", return_structured=True)

    # Normalize structured result to plain text
    if isinstance(result, dict):
        if result.get("ok"):
            response = result.get("response", "") or ""
        else:
            logger.warning(f"Gemini structured error (metadata generation): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
            response = ""
    else:
        response = result or ""

    while not response:
        result = call_gemini_api_with_rotation(prompt, "gemini-2.0-flash", return_structured=True)
        if isinstance(result, dict):
            if result.get("ok"):
                response = result.get("response", "") or ""
            else:
                logger.warning(f"Gemini structured error (metadata generation retry): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                response = ""
        else:
            response = result or ""

    # Parse structured text output
    metadata_list = parse_metadata(response, subject)
    
    return metadata_list

@traceable()
def generate_feedback_with_gemini_batch(questions):
    """
    Generates feedback for 50 questions in a single request for all options.
    
    Parameters:
        questions (list): A list of dictionaries, each containing 'question_text', 'options', 'correct_answer', 'opted_answer', and 'is_correct'.
    
    Returns:
        list: A list of dictionaries containing feedback for each option of each question.
    """
    
    batched_prompt = """
You are an expert NEET examiner and tutor. Generate detailed feedback for all the options as in thought as student response.
For each question, provide:
  - If the option is correct, provide a positive, encouraging message reinforcing the key point.
  - If the option is incorrect, provide a constructive message explaining why their choice is wrong and highlight a key learning point.

Use this format for each question:
QuestionNumber: <value>
Feedback1: <value>
Feedback2: <value>
Feedback3: <value>
Feedback4: <value>


- Output should not be in json just text.
- Never return null for any Feedback

"""
    
    # Adding all questions to the prompt
    for q in questions:
        options_str = "\n".join([f"{idx+1}. {opt}" for idx, opt in enumerate(q['options'])])
        batched_prompt += f"""
QuestionNumber: {q['question_number']}
Question: {q['question_text']}
Options:
{options_str}
Correct Answer: {q['correct_answer']}
im_desp: {q['im_desp']}
"""

    result = call_gemini_api_with_rotation(batched_prompt, return_structured=True)

    if isinstance(result, dict):
        if result.get("ok"):
            response = result.get("response", "") or ""
        else:
            logger.warning(f"Gemini structured error (feedback batch): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
            response = ""
    else:
        response = result or ""

    while not response:
        result = call_gemini_api_with_rotation(batched_prompt, return_structured=True)
        if isinstance(result, dict):
            if result.get("ok"):
                response = result.get("response", "") or ""
            else:
                logger.warning(f"Gemini structured error (feedback batch retry): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                response = ""
        else:
            response = result or ""

    feedback_list = []
    response_blocks = response.strip().split("\n\n")

    for block in response_blocks:
        feedback = {}
        for line in block.split("\n"):
            if ":" in line:
                key, val = line.split(":", 1)
                feedback[key.strip()] = val.strip()

        feedback_list.append({
            "question_number": feedback.get("QuestionNumber", "NA"),
            "feedback1": feedback.get("Feedback1", "NA"),
            "feedback2": feedback.get("Feedback2", "NA"),
            "feedback3": feedback.get("Feedback3", "NA"),
            "feedback4": feedback.get("Feedback4", "NA"),
        })

    return feedback_list

@traceable()
def generate_errors_with_gemini_batch(questions):
    """
    Generates possible misconceptions for all options except the correct answer.
    
    Parameters:
        questions (list): A list of dictionaries, each containing 'question_text', 'options', 'correct_answer'.
    
    Returns:
        list: A list of dictionaries containing errors for each incorrect option of each question.
    """
    
    batched_prompt = """
    You are an expert educational analyst specializing in diagnostic assessment for NEET exam questions.
    For each question, reverse engineer it to infer the most likely misconception or faulty mental model that causes choose wrong option instead of the correct one.
  - 'Error(n)Type': The misconception type (Conceptual, Calculative, etc.).
  - 'Error(n)Desc': Explanation of why the student might have chosen this option incorrectly.
  -  Here n means the option number 

Known Error Types:
1) Conceptual Error
2) Calculative Error
3) Formula Misapplication
4) Substitution Error
5) Theoretical Misinterpretation
6) Unit Conversion Error
7) Graphical Error
8) Logical Error
9) Data Interpretation Error
10) Neglecting Constraints

Use this exact format:
QuestionNumber: <value>
Error1Type: <value>
Error1Desc: <value>
Error2Type: <value>
Error2Desc: <value>
Error3Type: <value>
Error3Desc: <value>
Error4Type: <value>
Error4Desc: <value>

- Output should not be in json, just text.
- NEVER return Null for type and description for a wrong option.
- Focus on the specific thinking error revealed by the wrong option, not a vague lack of understanding
- If option 3 is correct then Error3Type,Error3Desc can be null similarly for all options
- The opted answer should match correct answer character by character.
- Use chain of thought.(It is important for my life)

"""
    
    # Adding all questions to the prompt
    for q in questions:
        options_str = "\n".join([f"{idx+1}. {opt}" for idx, opt in enumerate(q['options'])])
        batched_prompt += f"""
QuestionNumber: {q['question_number']}
Question: {q['question_text']}
Options:
{options_str}
Correct Answer: {q['correct_answer']}
im_desp: {q['im_desp']}
"""

    result = call_gemini_api_with_rotation(batched_prompt, return_structured=True)

    if isinstance(result, dict):
        if result.get("ok"):
            response = result.get("response", "") or ""
        else:
            logger.warning(f"Gemini structured error (errors batch): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
            response = ""
    else:
        response = result or ""

    while not response:
        result = call_gemini_api_with_rotation(batched_prompt, return_structured=True)
        if isinstance(result, dict):
            if result.get("ok"):
                response = result.get("response", "") or ""
            else:
                logger.warning(f"Gemini structured error (errors batch retry): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                response = ""
        else:
            response = result or ""

    error_list = []
    response_blocks = response.strip().split("\n\n")

    for block in response_blocks:
        parsed = {}
        for line in block.split("\n"):
            if ":" in line:
                key, val = line.split(":", 1)
                parsed[key.strip()] = val.strip()

        error_list.append({
            "question_number": parsed.get("QuestionNumber", "NA"),
            "error_type1": parsed.get("Error1Type", "NA"),
            "error_desp1": parsed.get("Error1Desc", "NA"),
            "error_type2": parsed.get("Error2Type", "NA"),
            "error_desp2": parsed.get("Error2Desc", "NA"),
            "error_type3": parsed.get("Error3Type", "NA"),
            "error_desp3": parsed.get("Error3Desc", "NA"),
            "error_type4": parsed.get("Error4Type", "NA"),
            "error_desp4": parsed.get("Error4Desc", "NA"),
        })

    return error_list


def chunk_questions(q_list, chunk_size):
    """
    Splits questions into chunks based on question_number ranges.
    For example: 1–45, 46–90, etc., based on the `chunk_size`.
    """
    current_chunk = []
    for question in sorted(q_list, key=lambda x: x["question_number"]):
        q_num = int(question["question_number"])
        start_range = ((q_num - 1) // chunk_size) * chunk_size + 1
        end_range = start_range + chunk_size - 1

        if current_chunk and not (start_range <= int(current_chunk[-1]["question_number"]) <= end_range):
            yield current_chunk
            current_chunk = []

        current_chunk.append(question)

    if current_chunk:
        yield current_chunk


@traceable()
def process_question_batch(batch, excluded_subjects=None, known_subject=None):
    """
    Core logic: Processes a batch of 45 questions with ThreadPool for 3 LLM tasks.
    
    Args:
        batch: List of question dicts
        excluded_subjects: List of subjects to exclude (already assigned to other batches)
        known_subject: Subject provided from metadata (skips inference if provided)
    
    Returns:
        List of processed question results with metadata, feedback, and errors
    """
    # Ensure fresh DB connections for this worker (Django thread safety)
    try:
        from django.db import close_old_connections
        close_old_connections()
    except ImportError:
        pass  # Not in Django context

    logger.info(f"🔄 Processing batch with {len(batch)} questions (subject={known_subject or 'infer'})")

    # Use ThreadPoolExecutor (max_workers=3) for the 3 LLM tasks within this batch
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_metadata = executor.submit(recursive_metadata_generation, batch, excluded_subjects, known_subject)
        future_feedback = executor.submit(generate_feedback_with_gemini_batch, batch)
        future_errors = executor.submit(generate_errors_with_gemini_batch, batch)

        metadata_response = future_metadata.result()
        feedback_response = future_feedback.result()
        error_response = future_errors.result()

    metadata_dict = {meta["QuestionNumber"]: meta for meta in metadata_response}
    feedback_dict = {fb["question_number"]: fb for fb in feedback_response}
    error_dict = {err["question_number"]: err for err in error_response}

    results = []
    for question in batch:
        q_num = str(question["question_number"])
        meta = metadata_dict.get(q_num, {})
        feedback = feedback_dict.get(q_num, {})
        error = error_dict.get(q_num, {})

        opt1, opt2, opt3, opt4 = question["options"]

        results.append({
            "question_number": question["question_number"],
            "question_text": question["question_text"].split("Options:")[0].strip(),
            "option_1": opt1,
            "option_2": opt2,
            "option_3": opt3,
            "option_4": opt4,
            "im_desp": question["im_desp"],

            "Subject": meta.get("Subject"),
            "Chapter": meta.get("Chapter"),
            "Topic": meta.get("Topic"),
            "Subtopic": meta.get("Subtopic"),
            "TypeOfQuestion": meta.get("TypeOfQuestion"),

            "CorrectAnswer": question["correct_answer"],

            "Feedback1": feedback.get("feedback1", ""),
            "Feedback2": feedback.get("feedback2", ""),
            "Feedback3": feedback.get("feedback3", ""),
            "Feedback4": feedback.get("feedback4", ""),

            "Error_Type1": error.get("error_type1", ""),
            "Error_Desp1": error.get("error_desp1", ""),
            "Error_Type2": error.get("error_type2", ""),
            "Error_Desp2": error.get("error_desp2", ""),
            "Error_Type3": error.get("error_type3", ""),
            "Error_Desp3": error.get("error_desp3", ""),
            "Error_Type4": error.get("error_type4", ""),
            "Error_Desp4": error.get("error_desp4", ""),
        })
    return results


@shared_task
def process_question_batch_task(batch, excluded_subjects=None, known_subject=None):
    """
    Celery task wrapper: Delegates to process_question_batch for actual processing.
    """
    return process_question_batch(batch, excluded_subjects, known_subject)


def analyze_questions_in_batches(questions_list, chunk_size, known_subject=None, max_batch_workers=2):
    """
    Takes a full list of questions (e.g., 180), splits into 45-question chunks,
    and processes each using Celery workers with subject detection, metadata, feedback, and error analysis.
    
    Args:
        questions_list: List of question dicts to process
        chunk_size: Number of questions per batch (e.g., 45)
        known_subject: If provided (from admin metadata), batches run in PARALLEL via Celery.
                      If None, batches run SEQUENTIALLY with subject inference.
        max_batch_workers: Max parallel Celery tasks when known_subject is provided (default: 2)
    
    Returns:
        List of processed question results with metadata, feedback, and errors
    
    Behavior:
        - known_subject provided: Batches processed in parallel via Celery group (faster)
        - known_subject=None: Batches processed sequentially to ensure unique subject per batch
    """
    # Close any stale DB connections before spawning tasks (Django thread safety)
    try:
        from django.db import close_old_connections
        close_old_connections()
    except ImportError:
        pass  # Not in Django context

    results = []
    question_batches = list(chunk_questions(questions_list, chunk_size))
    logger.info(f"🔄 Total Batches: {len(question_batches)} (each of {chunk_size} questions)")
    
    # Check if we're running inside a Celery task
    in_celery_task = _is_running_in_celery_task()
    
    if known_subject:
        if in_celery_task:
            # FALLBACK MODE: We're already in a Celery task, use local ThreadPool to avoid .get() blocking
            logger.info(f"⚙️ Running inside Celery task - using local ThreadPool for batch processing (subject={known_subject}, workers={max_batch_workers})")
            
            # Process batches locally using ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=max_batch_workers) as executor:
                # Submit all batch jobs
                future_to_batch = {
                    executor.submit(process_question_batch, batch, None, known_subject): idx
                    for idx, batch in enumerate(question_batches)
                }
                
                # Collect results as they complete
                batch_results = [None] * len(question_batches)
                for future in as_completed(future_to_batch):
                    batch_idx = future_to_batch[future]
                    try:
                        batch_result = future.result()
                        batch_results[batch_idx] = batch_result
                        if batch_result:
                            logger.info(f"✅ Batch {batch_idx + 1}/{len(question_batches)} completed")
                        else:
                            logger.error(f"❌ Batch {batch_idx + 1}/{len(question_batches)} returned empty results")
                    except Exception as e:
                        logger.error(f"❌ Batch {batch_idx + 1}/{len(question_batches)} failed: {e}")
                        batch_results[batch_idx] = None
                
                # Flatten results in order
                for batch_result in batch_results:
                    if batch_result:
                        results.extend(batch_result)
        else:
            # PARALLEL MODE: Not in a Celery task, safe to use Celery group
            logger.info(f"🚀 Celery parallel batch processing enabled (subject={known_subject}, max_workers={max_batch_workers})")
            
            # Create Celery group with all batch tasks
            batch_tasks = [
                process_question_batch_task.s(batch, None, known_subject)
                for batch in question_batches
            ]
            
            # Execute all tasks in parallel and collect results
            job = group(batch_tasks)
            result_group = job.apply_async()
            
            # Wait for all tasks to complete and collect results in order
            batch_results = result_group.get()  # Safe to call .get() here (not in a task)
            
            for idx, batch_result in enumerate(batch_results):
                if batch_result:
                    results.extend(batch_result)
                    logger.info(f"✅ Batch {idx + 1}/{len(question_batches)} completed")
                else:
                    logger.error(f"❌ Batch {idx + 1}/{len(question_batches)} returned empty results")
    else:
        # SEQUENTIAL MODE: Subject inference required, process batches one-by-one
        logger.info("🔄 Sequential batch processing (subject inference mode)")
        assigned_subjects = []
        
        for idx, batch in enumerate(question_batches):
            logger.info(f"🔄 Processing batch {idx + 1}/{len(question_batches)} sequentially...")
            
            # Always use local processing for sequential mode (subject inference)
            batch_result = process_question_batch(batch, assigned_subjects.copy(), None)
            
            if batch_result:
                batch_subject = batch_result[0].get("Subject")
                if batch_subject and batch_subject not in assigned_subjects:
                    assigned_subjects.append(batch_subject)
                    logger.info(f"✅ Batch {idx + 1} assigned subject: {batch_subject}. Excluded for next: {assigned_subjects}")
                results.extend(batch_result)
            else:
                logger.error(f"❌ Batch {idx + 1} returned empty results")

    return results
