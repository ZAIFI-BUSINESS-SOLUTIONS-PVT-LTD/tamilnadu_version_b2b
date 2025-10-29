from exam.llm_call.gemini_api import call_gemini_api_with_rotation
import logging

logger = logging.getLogger(__name__)

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
            model = "gemini-2.0-flash-lite"
            subject = call_gemini_api_with_rotation(prompt, model)
            subject = subject.strip().title()

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
