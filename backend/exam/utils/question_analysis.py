from exam.ingestions.populate_analysis import save_analysis
from exam.models.question_paper import QuestionPaper
from exam.utils.analysis_generator import analyze_questions_in_batches
from exam.models.test_status import TestProcessingStatus
import logging

logger = logging.getLogger(__name__)

def analyse_questions(class_id, test_num, subject):
    
    status_obj, _ = TestProcessingStatus.objects.get_or_create(
            class_id=class_id, test_num=test_num
        )
    
    stored_questions = list(QuestionPaper.objects.filter(class_id=class_id, test_num=test_num, subject=subject).values(
        "question_number", "question_text", "option_1", "option_2", "option_3", "option_4", "correct_answer", "im_desp"
    ))

    if not stored_questions:
        error_msg = f"❌ ERROR: No questions found for class {class_id}, test {test_num}, subject {subject}."
        logger.error(error_msg)
        #print(error_msg)
        raise ValueError(error_msg)
        
    status_obj.logs += f"📊 Retrieved {len(stored_questions)} questions for class {class_id}, test {test_num}, subject {subject}."
    status_obj.save()
    logger.info(f"📊 Retrieved {len(stored_questions)} questions for class {class_id}, test {test_num}, subject {subject}.")
    #print(f"📊 Retrieved {len(stored_questions)} questions for class {class_id}, test {test_num}.")

    # Prepare questions for batch processing
    questions_list = [
        {
            "question_number": q["question_number"],
            "question_text": q["question_text"],
            "options": [q["option_1"], q["option_2"], q["option_3"], q["option_4"]],
            "correct_answer": q["correct_answer"],
            "im_desp": q["im_desp"]
        }
        for q in stored_questions
    ]


    # Process in batches of 45
    chunk_size = int(len(stored_questions)/4)
    result = analyze_questions_in_batches(questions_list, chunk_size)
        # Store metadata, feedback, and errors in DB
            # Store metadata, feedback, and errors in DB
    while True:
        try:
            save_analysis(result, class_id, test_num)
            break  # If no error, break the loop
        except Exception as e:
            # Optionally log the error
            status_obj.status = "Failed"
            status_obj.logs += f"Save failed: {e}. Re-analyzing and retrying..."
            status_obj.save()
            logger.error(f"Save failed: {e}. Re-analyzing and retrying...")
            #print(f"Save failed: {e}. Re-analyzing and retrying...")
            result = analyze_questions_in_batches(questions_list, chunk_size)


    status_obj.status = "Successful"
    status_obj.logs += f"✅ Analysis, feedback, and error data stored successfully for class {class_id}, test {test_num}."
    status_obj.save()
    logger.info(f"✅ Analysis, feedback, and error data stored successfully for class {class_id}, test {test_num}.")
    #print(f"✅ Analysis, feedback, and error data stored successfully for class {class_id}, test {test_num}.")
