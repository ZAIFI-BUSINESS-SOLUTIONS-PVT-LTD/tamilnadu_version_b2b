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
    
    # Get all unique subjects for this test from QuestionPaper
    if subject is None:
        # Get all subjects present in the test
        subjects = list(QuestionPaper.objects.filter(
            class_id=class_id, 
            test_num=test_num
        ).values_list('subject', flat=True).distinct())
        
        if not subjects:
            error_msg = f"❌ ERROR: No questions found for class {class_id}, test {test_num}."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"📊 Found {len(subjects)} subjects in test: {subjects}")
        status_obj.logs += f"📊 Found {len(subjects)} subjects in test: {subjects}\n"
        status_obj.save()
    else:
        # Process only the specified subject
        subjects = [subject]
    
    # Process each subject separately
    for current_subject in subjects:
        logger.info(f"🔍 Analyzing {current_subject}...")
        status_obj.logs += f"🔍 Analyzing {current_subject}...\n"
        status_obj.save()
        
        stored_questions = list(QuestionPaper.objects.filter(
            class_id=class_id, 
            test_num=test_num, 
            subject=current_subject
        ).values(
            "question_number", "question_text", "option_1", "option_2", 
            "option_3", "option_4", "correct_answer", "im_desp"
        ))

        if not stored_questions:
            logger.warning(f"⚠️ No questions found for subject {current_subject}")
            status_obj.logs += f"⚠️ No questions found for subject {current_subject}\n"
            status_obj.save()
            continue
            
        logger.info(f"📊 Retrieved {len(stored_questions)} questions for class {class_id}, test {test_num}, subject {current_subject}.")
        status_obj.logs += f"📊 Retrieved {len(stored_questions)} questions for subject {current_subject}\n"
        status_obj.save()

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

        # Process in batches - chunk_size determines how many questions per LLM call
        # For metadata-driven flow, questions are already correctly split by subject
        chunk_size = min(45, len(stored_questions))
        
        # Pass known_subject so the LLM doesn't re-detect the subject
        result = analyze_questions_in_batches(questions_list, chunk_size, known_subject=current_subject)
        
        # Store metadata, feedback, and errors in DB
        while True:
            try:
                save_analysis(result, class_id, test_num)
                break  # If no error, break the loop
            except Exception as e:
                # Optionally log the error
                status_obj.status = "Failed"
                status_obj.logs += f"Save failed for {current_subject}: {e}. Re-analyzing and retrying...\n"
                status_obj.save()
                logger.error(f"Save failed for {current_subject}: {e}. Re-analyzing and retrying...")
                result = analyze_questions_in_batches(questions_list, chunk_size, known_subject=current_subject)

        logger.info(f"✅ Analysis complete for {current_subject}")
        status_obj.logs += f"✅ Analysis complete for {current_subject}\n"
        status_obj.save()

    status_obj.status = "Successful"
    status_obj.logs += f"✅ Analysis, feedback, and error data stored successfully for class {class_id}, test {test_num}.\n"
    status_obj.save()
    logger.info(f"✅ Analysis, feedback, and error data stored successfully for class {class_id}, test {test_num}.")
