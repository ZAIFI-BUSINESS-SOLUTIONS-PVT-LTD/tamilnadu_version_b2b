import pandas as pd
from exam.models import Student, QuestionAnalysis, StudentResponse, Test, Result
from exam.graph_utils.create_graph import create_graph
from exam.models.test_status import TestProcessingStatus
import logging
from celery import group, shared_task, chord

logger = logging.getLogger(__name__)

class StudentAnalyzer:
    subject_map = {'Physics': 'phy', 'Chemistry': 'chem', 'Botany': 'bot', 'Zoology': 'zoo', 'Biology': 'bio'}

    def __init__(self, student_id, class_id, test_num, student_db, test_date, questions, response_map):
        self.student_id = student_id
        self.class_id = class_id
        self.test_num = test_num
        self.student_db = student_db
        self.test_date = test_date
        self.questions = questions
        self.response_map = response_map
        self.analysis = []

    def analyze(self):
        for q in self.questions:
            qnum = q['question_number']
            selected = self.response_map.get(str(qnum))
            if selected in ['1', '2', '3', '4']:
                idx = int(selected)
                opted = q.get(f"option_{idx}")
                is_correct = q['correct_answer'] == opted
                feedback = q.get(f"option_{idx}_feedback", "NA")
                error_type = q.get(f"option_{idx}_type", "NA")
                error_desp = q.get(f"option_{idx}_misconception", "NA")
            else:
                opted = None
                is_correct = False
                feedback = "NA"
                error_type = "NA"
                error_desp = "NA"
            self.analysis.append({
                "TestDate": self.test_date,
                "QuestionNumber": qnum,
                "QuestionText": q['question_text'],
                "im_descp": q.get('im_desp', ''),
                "Subject": q.get("subject"),
                "Chapter": q['chapter'],
                "Topic": q['topic'],
                "Subtopic": q['subtopic'],
                "TypeOfQuestion": q['typeOfquestion'],
                "CorrectAnswer": q['correct_answer'],
                "OptedAnswer": opted,
                "IsCorrect": is_correct,
                "Feedback": feedback,
                "Error_Type": error_type,
                "Error_Desp": error_desp
            })
        return self.analysis

    def get_summary(self):
        # Get unique subjects from the analyzed questions
        all_subjects = list(set(q.get('subject') for q in self.analysis if q.get('subject')))
        
        student_df = pd.DataFrame(self.analysis)
        
        # If student_df is empty for any subject, we need to ensure it's represented with zeros
        for subject in all_subjects:
            if subject not in student_df['Subject'].unique():
                # Add empty row for missing subject
                empty_row = pd.DataFrame([{
                    'Subject': subject,
                    'QuestionNumber': None,
                    'OptedAnswer': None,
                    'IsCorrect': False
                }])
                student_df = pd.concat([student_df, empty_row], ignore_index=True)
        
        total_questions = student_df.groupby("Subject")["QuestionNumber"].count().rename("TotalQuestions")
        attended_questions = student_df[
            student_df["OptedAnswer"].notnull() & (student_df["OptedAnswer"] != '')
        ].groupby("Subject")["QuestionNumber"].count().rename("AttendedQuestions")
        correct_questions = student_df[
            (student_df["OptedAnswer"].notnull()) &
            (student_df["OptedAnswer"] != '') &
            (student_df["IsCorrect"] == True)
        ].groupby("Subject")["QuestionNumber"].count().rename("CorrectQuestions")
        
        summary_df = pd.concat([total_questions, attended_questions, correct_questions], axis=1).fillna(0).astype(int)
        summary_df.reset_index(inplace=True)
        return summary_df

    def save_results(self, summary_df):
        # Initialize result data with all fields set to 0
        result_data = {
            'student_id': self.student_id,
            'class_id': self.class_id,
            'test_num': self.test_num,
            'phy_total': 0, 'phy_attended': 0, 'phy_correct': 0,
            'chem_total': 0, 'chem_attended': 0, 'chem_correct': 0,
            'bot_total': 0, 'bot_attended': 0, 'bot_correct': 0,
            'zoo_total': 0, 'zoo_attended': 0, 'zoo_correct': 0,
            'bio_total': 0, 'bio_attended': 0, 'bio_correct': 0,
            'total_attended': 0, 'total_correct': 0
        }

        # Update with current subject data from summary_df
        for _, row in summary_df.iterrows():
            subject = row['Subject']
            sub = self.subject_map.get(subject)
            if sub:
                # Update subject-specific data
                result_data[f'{sub}_total'] = row['TotalQuestions']
                result_data[f'{sub}_attended'] = row['AttendedQuestions']
                result_data[f'{sub}_correct'] = row['CorrectQuestions']
                logger.info(f"Processing {subject} data for student {self.student_id}: {row['CorrectQuestions']}/{row['TotalQuestions']}")

        # Recalculate totals across all subjects
        for metric in ['attended', 'correct']:
            total = sum(
                result_data[f'{sub}_{metric}']
                for sub in ['phy', 'chem', 'bot', 'zoo', 'bio']
            )
            result_data[f'total_{metric}'] = total

        # Calculate scores for all subjects using the standard formula
        total_score = 0
        for subject_prefix in ['phy', 'chem', 'bot', 'zoo', 'bio']:
            # Score formula: (correct answers × 5) - total attended
            score = (result_data[f'{subject_prefix}_correct'] * 5) - result_data[f'{subject_prefix}_attended']
            result_data[f'{subject_prefix}_score'] = score
            total_score += score
        
        result_data['total_score'] = total_score

        # Save results and log the operation
        try:
            result, created = Result.objects.update_or_create(
                student_id=self.student_id,
                class_id=self.class_id,
                test_num=self.test_num,
                defaults=result_data
            )
            logger.info(f"{'Created' if created else 'Updated'} results for student {self.student_id}, "
                      f"test {self.test_num} with scores: "
                      f"Physics: {result_data['phy_score']}, "
                      f"Chemistry: {result_data['chem_score']}, "
                      f"Botany: {result_data['bot_score']}, "
                      f"Zoology: {result_data['zoo_score']}, "
                      f"Biology: {result_data['bio_score']}, "
                      f"Total: {total_score}")
        except Exception as e:
            logger.error(f"Error saving results for student {self.student_id}: {str(e)}")

# Utility functions

def fetch_questions(class_id, test_num, subject=None):
    # If subject is provided, filter by it, otherwise get all subjects
    query = QuestionAnalysis.objects.filter(class_id=class_id, test_num=test_num)
    if subject:
        query = query.filter(subject=subject)
    
    return list(query.values(
        "question_number", "chapter", "topic", "subtopic", "typeOfquestion", "question_text",
        "option_1", "option_2", "option_3", "option_4", "correct_answer",
        "option_1_feedback", "option_2_feedback", "option_3_feedback", "option_4_feedback",
        "option_1_type", "option_2_type", "option_3_type", "option_4_type",
        "option_1_misconception", "option_2_misconception", "option_3_misconception", "option_4_misconception",
        "im_desp", "test_num", "subject"
    ))

def fetch_student_responses(student_id, class_id, test_num):
    return {
        resp["question_number"]: resp["selected_answer"]
        for resp in StudentResponse.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).values("question_number", "selected_answer")
    }

@shared_task
def analyze_single_student(student_id, class_id, student_db, questions, test_date, response_map, test_num):
    analyzer = StudentAnalyzer(student_id, class_id, test_num, student_db, test_date, questions, response_map)
    analyzer.analyze()
    summary_df = analyzer.get_summary()
    #print(f"📊 Summary for {student_id} in class {class_id}, test {test_num}:\n{summary_df}")
    analyzer.save_results(summary_df)
    create_graph(student_id, student_db.lower(), pd.DataFrame(analyzer.analysis), test_num)

@shared_task
def analyse_students(class_id, test_num, subject=None):
    status_obj, _ = TestProcessingStatus.objects.get_or_create(class_id=class_id, test_num=test_num)
    students = Student.objects.filter(class_id=class_id)
    if not students:
        status_obj.logs += f"⚠️ No students found for class {class_id}."
        status_obj.save()
        logger.warning(f"⚠️ No students found for class {class_id}.")
        return
        
    # Get all unique subjects for this test from QuestionAnalysis
    subjects = list(QuestionAnalysis.objects.filter(
        class_id=class_id,
        test_num=test_num
    ).values_list('subject', flat=True).distinct())
    
    # Get all questions for the test, optionally filtered by subject
    if not subjects:
        status_obj.logs += f"⚠️ No subjects found in QuestionAnalysis for class {class_id}, test {test_num}."
        status_obj.save()
        logger.warning(f"⚠️ No subjects found in QuestionAnalysis for class {class_id}, test {test_num}.")
        return

    test_obj = Test.objects.filter(class_id=class_id, test_num=test_num).first()
    test_date = test_obj.date if test_obj else "Unknown"
    
    # Create tasks for each student, processing all subjects
    tasks = []
    for student in students:
        response_map = fetch_student_responses(student.student_id, class_id, test_num)
        if not response_map:
            status_obj.logs += f"🚫 Student {student.student_id} did not attend test {test_num}. Skipping."
            status_obj.save()
            logger.info(f"🚫 Student {student.student_id} did not attend test {test_num}. Skipping.")
            continue
            
        # Get all questions for all subjects
        all_questions = []
        for subject in subjects:
            subject_questions = fetch_questions(class_id, test_num, subject)
            if subject_questions:
                all_questions.extend(subject_questions)
            
            if not all_questions:
                status_obj.logs += f"⚠️ No questions found for any subject in class {class_id}, test {test_num}."
                status_obj.save()
                continue
            
        tasks.append(analyze_single_student.s(
            student.student_id, student.class_id, student.neo4j_db, all_questions, test_date, response_map, test_num
        ))
    
    if tasks:
        logger.info(f"🔄 Scheduling {len(tasks)} student analysis tasks for class {class_id}, test {test_num}...")
        # Import here to avoid circular dependency
        from exam.services.update_dashboard import update_student_dashboard
        
        # Use chord: run all student analysis tasks, then update dashboard when all complete
        # Use an immutable signature (.si) so Celery does NOT prepend the header results
        # as the first positional argument to the callback. This keeps the callback
        # signature as `update_student_dashboard(class_id, test_num)`.
        chord(tasks)(update_student_dashboard.si(class_id, test_num))
        logger.info(f"✅ Student analysis tasks scheduled with dashboard update callback for class {class_id}, test {test_num}.")
    else:
        logger.warning(f"⚠️ No student analysis tasks to schedule for class {class_id}, test {test_num}.")
    
    status_obj.status = "Successful"
    status_obj.logs += f"✅ Analysis tasks scheduled for class {class_id}, test {test_num}."
    status_obj.save()
    logger.info(f"✅ Analysis tasks scheduled for class {class_id}, test {test_num}.")