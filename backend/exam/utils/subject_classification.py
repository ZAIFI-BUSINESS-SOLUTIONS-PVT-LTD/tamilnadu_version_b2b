from exam.llm_call.gemini_api import call_gemini_api_with_rotation
import logging
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)

@traceable()
def classify_biology_questions(questions_list: list) -> list:
    """
    Classifies a list of biology questions as 'Botany' or 'Zoology' using an LLM.
    """
    updated_questions = []
    for question in questions_list:
        try:
            prompt = f"""
            Analyze the following biology question and classify it as either 'Botany' or 'Zoology'.
            Return only the word 'Botany' or 'Zoology'.

            Question: {question['question_text']}
            Options: {question['options']}
            """
            model = "gemini-2.0-flash"
            result = call_gemini_api_with_rotation(prompt, model, return_structured=True)
            if isinstance(result, dict):
                if result.get("ok"):
                    subject = (result.get("response", "") or "").strip().title()
                else:
                    logger.warning(f"Gemini structured error (classify_biology_questions): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                    subject = ""
            else:
                subject = (result or "").strip().title()

            if subject in ["Botany", "Zoology"]:
                question['subject'] = subject
            else:
                question['subject'] = 'Biology'
            updated_questions.append(question)
        except Exception as e:
            logger.error(f"Error classifying question {question.get('question_number')}: {e}")
            question['subject'] = 'Biology'
            updated_questions.append(question)
    return updated_questions
