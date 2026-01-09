"""
LLM-based misconception inference for student wrong answers.

Uses Gemini 2.5 Flash to analyze multiple wrong questions in a single batch call
and infer what misconceptions the student had when selecting incorrect answers.
"""
import json
import logging
from typing import List, Dict
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)


MISCONCEPTION_PROMPT_TEMPLATE = """You are an expert educational analyst specializing in diagnostic assessment for NEET exam questions.

Analyze the following questions where a student selected an incorrect answer.

For each question, reverse engineer it to infer the most likely misconception or faulty mental model that caused the student to choose their selected option instead of the correct one.

A misconception is defined as a specific incorrect belief, overgeneralization, or misapplied rule that makes the chosen option seem correct to the student.

**Misconception Types** (classify each misconception into ONE of these categories):
1. "Conceptual Confusion" - Mixing up related but distinct concepts
2. "Incorrect Formula or Law Application" - Using wrong formula or applying a law incorrectly
3. "Ignoring Given Conditions or Exceptions" - Missing important conditions or special cases
4. "Overgeneralization of a Rule or Trend" - Applying a rule too broadly beyond its scope
5. "Misinterpretation of Diagram, Graph, or Representation" - Misreading visual information
6. "Partial Concept Understanding" - Incomplete grasp of the full concept

Important Instructions:
1. For each question, provide BOTH a misconception type (from the list above) AND a concise misconception text (1–2 sentences maximum)
2. Focus on the specific thinking error revealed by the chosen option, not a vague lack of understanding
3. Do NOT explain the correct answer unless necessary to contrast the misconception
4. Phrase the misconception as something the student might reasonably believe
5. Return the response as a valid JSON object with question numbers as keys
6. Format: {{"question_number": {{"type": "Misconception Type", "text": "misconception description"}}, ...}}

**Questions to analyze:**

{questions_data}

Return ONLY the JSON object with no additional text or markdown formatting.
"""


def format_question_for_prompt(question_data: Dict) -> str:
    """Format a single question's data for the LLM prompt."""
    return f"""
Question {question_data['question_number']}:
Subject: {question_data['subject']}
Chapter: {question_data['chapter']}
Topic: {question_data['topic']}

Question Text: {question_data['question_text']}

{question_data.get('im_desp', '')}

Options:
A) {question_data['option_1']}
B) {question_data['option_2']}
C) {question_data['option_3']}
D) {question_data['option_4']}

Correct Answer: {question_data['correct_answer']}
Student Selected: {question_data['opted_answer']}
---
"""


@traceable("misconception_inference")
def infer_misconceptions_batch(wrong_questions: List[Dict]) -> Dict[int, Dict[str, str]]:
    """
    Call Gemini 2.5 Flash with all wrong questions in one batch and get misconceptions.
    
    Args:
        wrong_questions: List of dicts with question data including:
            - question_number, subject, chapter, topic
            - question_text, im_desp (optional)
            - option_1, option_2, option_3, option_4
            - correct_answer, opted_answer
    
    Returns:
        Dict mapping question_number to dict with 'type' and 'text' keys
        Example: {12: {'type': 'Conceptual Confusion', 'text': 'Student confused...'}}
        Returns empty dict if LLM call fails
    """
    if not wrong_questions:
        logger.info("No wrong questions to analyze")
        return {}
    
    logger.info(f"🔍 Inferring misconceptions for {len(wrong_questions)} wrong questions via Gemini 2.5 Flash")
    
    try:
        # Format all questions for the prompt
        questions_text = "\n".join([
            format_question_for_prompt(q) for q in wrong_questions
        ])
        
        prompt = MISCONCEPTION_PROMPT_TEMPLATE.format(questions_data=questions_text)
        
        # Call Gemini 2.5 Flash with batch of questions
        response = call_gemini_api_with_rotation(
            prompt=prompt,
            model_name="gemini-2.5-flash",
            images=None
        )
        
        if not response:
            logger.error("❌ Empty response from Gemini API")
            return {}
        
        # Parse JSON response
        # Handle potential markdown code block wrapping
        response_clean = response.strip()
        if response_clean.startswith("```json"):
            response_clean = response_clean[7:]
        if response_clean.startswith("```"):
            response_clean = response_clean[3:]
        if response_clean.endswith("```"):
            response_clean = response_clean[:-3]
        response_clean = response_clean.strip()
        
        misconceptions = json.loads(response_clean)
        
        # Ensure all keys are integers and values have both 'type' and 'text'
        normalized = {}
        for k, v in misconceptions.items():
            qnum = int(k)
            if isinstance(v, dict) and 'type' in v and 'text' in v:
                normalized[qnum] = {'type': v['type'], 'text': v['text']}
            elif isinstance(v, str):
                # Fallback: if LLM returned string, treat as text with unknown type
                normalized[qnum] = {'type': 'Partial Concept Understanding', 'text': v}
            else:
                logger.warning(f"⚠️ Invalid format for question {qnum}, skipping")
        
        logger.info(f"✅ Successfully inferred {len(normalized)} misconceptions with types")
        return normalized
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse JSON from LLM response: {e}")
        logger.error(f"Raw response: {response[:500]}")
        return {}
    except Exception as e:
        logger.error(f"❌ Error during misconception inference: {e}", exc_info=True)
        return {}
