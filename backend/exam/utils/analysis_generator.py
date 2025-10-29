from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from concurrent.futures import ThreadPoolExecutor, as_completed
from exam.llm_call.NEET_data import chapter_list
import logging

logger = logging.getLogger(__name__)


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




def infer_subject_with_gemini(questions):
    """
    Infers the subject (Physics, Chemistry, Botany, Zoology) from a batch of NEET questions.
    """
    

    prompt = f"""
You are an expert NEET subject classifier. The following NEET questions belong to only **one subject**:

Physics, Chemistry, Botany, Zoology
kindly differentiate between Botany and Zoology
if you have doubt choose based on majority

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
        response = call_gemini_api_with_rotation(prompt,model_name="gemini-2.5-flash-preview-05-20")

        if response:
            subject = response
            if subject in ["Physics", "Chemistry", "Botany", "Zoology"]:
                return subject
            else:
                subject = infer_subject_with_gemini(questions)
                return subject
    return subject




def recursive_metadata_generation(batch):
    """
    Detects subject, then generates structured metadata for each question.
    """
    subject = infer_subject_with_gemini(batch)
    logger.info(f"📘 Subject detected: {subject}")
    #print(f"📘 Subject detected: {subject}")

    S_chapter_list = chapter_list.get(subject, [])
    
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


    response = call_gemini_api_with_rotation(prompt,"gemini-2.0-flash")

    while not response:
        response = call_gemini_api_with_rotation(prompt,"gemini-2.0-flash")

    # Parse structured text output
    metadata_list = parse_metadata(response,subject)
    
    return metadata_list

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

    response = call_gemini_api_with_rotation(batched_prompt)

    while not response:
        response = call_gemini_api_with_rotation(batched_prompt)

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

def generate_errors_with_gemini_batch(questions):
    """
    Generates possible misconceptions for all options except the correct answer.
    
    Parameters:
        questions (list): A list of dictionaries, each containing 'question_text', 'options', 'correct_answer'.
    
    Returns:
        list: A list of dictionaries containing errors for each incorrect option of each question.
    """
    
    batched_prompt = """
You are an expert NEET examiner and tutor. Identify possible misconceptions he would've had for choosing option.
error should have:
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

    response = call_gemini_api_with_rotation(batched_prompt)

    while not response:
        response = call_gemini_api_with_rotation(batched_prompt)

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


def process_question_batch(batch):
    """
    Processes a batch of 45 questions — full pipeline with subject inference.
    """

    def task_runner(fn, data):
        try:
            return fn(data)
        except Exception as e:
            logger.error(f"[Error in {fn.__name__}] {e}")
            #print(f"[Error in {fn.__name__}] {e}")
            return []

    with ThreadPoolExecutor(max_workers=3) as executor:
        future_metadata = executor.submit(recursive_metadata_generation, batch)
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

def analyze_questions_in_batches(questions_list, chunk_size):
    """
    Takes a full list of questions (e.g., 180), splits into 45-question chunks,
    and processes each using Gemini: subject detection, metadata, feedback, and error analysis.
    """
    # Prepare each question for Gemini input format

    results = []
    question_batches = list(chunk_questions(questions_list, chunk_size))
    logger.info(f"🔄 Total Batches: {len(question_batches)} (each of {chunk_size} questions)")
    #print(f"🔄 Total Batches: {len(question_batches)} (each of {chunk_size} questions)")

    with ThreadPoolExecutor(max_workers=min(5, len(question_batches))) as executor:
        futures = [executor.submit(process_question_batch, batch) for batch in question_batches]

        for idx, future in enumerate(as_completed(futures), 1):
            try:
                batch_result = future.result()
                logger.info(f"✅ Batch {idx} processed successfully.")
                #print(f"✅ Batch {idx} processed successfully.")
                results.extend(batch_result)
            except Exception as e:
                logger.error(f"❌ Error processing batch {idx}: {e}")
                #print(f"❌ Error processing batch {idx}: {e}")

    return results
