# Gemini CLI Guide: Implementing the Biology Subject Split Feature

This guide details the step-by-step implementation of the "Biology Subject Split" feature.

## Phase 1: Database Schema Update

### 1.1. Modify the `Educator` Model

*   **File:** `backend/exam/models/educator.py`
*   **Action:** Add a `separate_biology_subjects` boolean field to the `Educator` model.

    ```python
    # backend/exam/models/educator.py
    # ... (inside the Educator class)
    separate_biology_subjects = models.BooleanField(default=False)
    ```

### 1.2. Modify the `QuestionPaper` Model

*   **File:** `backend/exam/models/question_paper.py`
*   **Action:** Add a `subject` field to the `QuestionPaper` model and update the `unique_together` constraint.

    ```python
    # backend/exam/models/question_paper.py
    # ... (inside the QuestionPaper class)
    subject = models.CharField(max_length=255, null=True, blank=True)
    # ...
    class Meta:
        unique_together = ('class_id', 'test_num', 'question_number', 'subject')
    
    def __str__(self):
        return f"Q{self.question_number} ({self.subject}) - Test {self.test_num} (Class {self.class_id})"
    ```

### 1.3. Run Database Migrations

*   **Action:** Execute the following commands in the terminal:
    1.  `python manage.py makemigrations`
    2.  `python manage.py migrate`

## Phase 2: User Interface for Preference

### 2.1. Update Django Admin for `Educator` Model

*   **File:** `backend/exam/admin.py`
*   **Action:** Update the `EducatorAdmin` class to display the `separate_biology_subjects` field.

    ```python
    # backend/exam/admin.py
    from django.contrib import admin
    from .models import Educator

    class EducatorAdmin(admin.ModelAdmin):
        list_display = ('name', 'email', 'class_id', 'institution', 'separate_biology_subjects')
        search_fields = ('name', 'email', 'class_id')
        list_filter = ('institution', 'separate_biology_subjects')

    admin.site.register(Educator, EducatorAdmin)
    ```

## Phase 3: Adapted Data Processing Pipeline

### 3.1. Create `get_subject_from_q_paper` in `pdf_processing.py`

*   **File:** `backend/exam/utils/pdf_processing.py`
*   **Action:** Add the `get_subject_from_q_paper` function.

    ```python
    # backend/exam/utils/pdf_processing.py
    # ... (at the end of the file)
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
    ```

### 3.2. Create `get_subject_from_answer_key` in `csv_processing.py`

*   **File:** `backend/exam/utils/csv_processing.py`
*   **Action:** Add the `get_subject_from_answer_key` function.

    ```python
    # backend/exam/utils/csv_processing.py
    # ... (at the end of the file)
    def get_subject_from_answer_key(path: str) -> Optional[str]:
        """
        Checks for a 'Subject' column in the answer key and returns the subject.
        """
        actual_path = find_actual_file(path)
        if not actual_path:
            return None
        try:
            ext = os.path.splitext(actual_path)[1].lower()
            if ext == '.csv':
                with default_storage.open(actual_path, "rb") as f:
                    df = pd.read_csv(TextIOWrapper(f, encoding="utf-8-sig"))
            elif ext in ['.xls', '.xlsx']:
                with default_storage.open(actual_path, "rb") as f:
                    df = pd.read_excel(f)
            else:
                return None

            df.columns = df.columns.str.strip().str.lower()
            if "subject" in df.columns:
                return df["subject"].iloc[0]
            return None
        except Exception as e:
            logger.error(f"[get_subject_from_answer_key] ❌ {e}")
            return None
    ```

### 3.3. Create `get_subject` in `process_test_data.py`

*   **File:** `backend/exam/services/process_test_data.py`
*   **Action:** Add the `get_subject` function.

    ```python
    # backend/exam/services/process_test_data.py
    # ... (before the process_test_data function)
    from exam.utils.pdf_processing import get_subject_from_q_paper
    from exam.utils.csv_processing import get_subject_from_answer_key

    def get_subject(class_id, answer_key_path, question_paper_path):
        class_id_lower = class_id.lower()
        if "biology" in class_id_lower:
            return "Biology"
        if "botany" in class_id_lower:
            return "Botany"
        if "zoology" in class_id_lower:
            return "Zoology"

        subject = get_subject_from_answer_key(answer_key_path)
        if subject:
            return subject

        return get_subject_from_q_paper(question_paper_path)
    ```

### 3.4. Create `subject_classification.py`

*   **File:** `backend/exam/utils/subject_classification.py` (New File)
*   **Action:** Create the file and add the `classify_biology_questions` function.

    ```python
    # backend/exam/utils/subject_classification.py
    from exam.llm_call.gemini_api import call_gemini_api_with_rotation
    import logging

    logger = logging.getLogger(__name__)

    def classify_biology_questions(questions_list: list) -> list:
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
    ```

### 3.5. Modify `process_test_data.py`

*   **File:** `backend/exam/services/process_test_data.py`
*   **Action:** Refactor the `process_test_data` function.

    ```python
    # backend/exam/services/process_test_data.py
    from exam.models.educator import Educator
    from exam.utils.subject_classification import classify_biology_questions

    @shared_task
    def process_test_data(class_id, test_num):
        # ... (setup code)
        try:
            educator = Educator.objects.get(class_id=class_id)
            should_split_biology = educator.separate_biology_subjects
        except Educator.DoesNotExist:
            should_split_biology = False

        subject = get_subject(class_id, answer_key_path, question_paper_path)

        if subject == "Biology" and should_split_biology:
            questions_list = questions_extract(question_paper_path, test_path)
            classified_questions = classify_biology_questions(questions_list)
            save_questions_bulk(class_id, test_num, classified_questions, answer_dict)

            for sub in ["Botany", "Zoology"]:
                analyse_questions(class_id, test_num, sub)
                analyse_students(class_id, test_num, sub)
        else:
            questions_list = questions_extract(question_paper_path, test_path)
            for q in questions_list:
                q['subject'] = subject
            save_questions_bulk(class_id, test_num, questions_list, answer_dict)
            analyse_questions(class_id, test_num, subject)
            analyse_students(class_id, test_num, subject)

        update_student_dashboard(class_id, test_num)
        update_educator_dashboard(class_id, test_num)
        # ...
    ```

## Phase 4: Downstream Analysis Modifications

### 4.1. Modify `populate_question.py`

*   **File:** `backend/exam/ingestions/populate_question.py`
*   **Action:** Update `save_questions_bulk` to save the `subject`.

    ```python
    # backend/exam/ingestions/populate_question.py
    # ... (inside the save_questions_bulk function's loop)
    question_paper_objects.append(
        QuestionPaper(
            # ...
            subject=q.get('subject', 'Unknown'),
            # ...
        )
    )
    ```

### 4.2. Modify `question_analysis.py`

*   **File:** `backend/exam/utils/question_analysis.py`
*   **Action:** Update `analyse_questions` to filter by `subject`.

    ```python
    # backend/exam/utils/question_analysis.py
    def analyse_questions(class_id, test_num, subject):
        # ...
        stored_questions = list(QuestionPaper.objects.filter(
            class_id=class_id,
            test_num=test_num,
            subject=subject
        ).values(...))
        # ...
    ```

### 4.3. Modify `student_analysis.py`

*   **File:** `backend/exam/utils/student_analysis.py`
*   **Action:** Update `analyse_students` and `fetch_questions` to filter by `subject`.

    ```python
    # backend/exam/utils/student_analysis.py
    def fetch_questions(class_id, test_num, subject):
        return list(QuestionAnalysis.objects.filter(
            class_id=class_id,
            test_num=test_num,
            subject=subject
        ).values(...))

    @shared_task
    def analyse_students(class_id, test_num, subject):
        # ...
        questions = fetch_questions(class_id, test_num, subject)
        # ...
    ```

---

## Implementation Log

This log details the steps taken by the Gemini CLI to implement the "Biology Subject Split" feature, following the guide above.

### Phase 1: Database Schema Update - ✅ Completed

*   **Step 1.1: Modify the `Educator` Model** - ✅ Completed
    *   **File:** `backend/exam/models/educator.py`
    *   **Action:** Added the `separate_biology_subjects` boolean field to the `Educator` model.

*   **Step 1.2: Modify the `QuestionPaper` Model** - ✅ Completed
    *   **File:** `backend/exam/models/question_paper.py`
    *   **Action:** Added the `subject` field and updated the `unique_together` constraint in the `QuestionPaper` model.

*   **Step 1.3: Run Database Migrations** - ✅ Completed
    *   **Action:**
        1.  Ran `python3 backend/manage.py makemigrations` to create the migration file `0003_educator_manager_overview_performance_and_more.py`.
        2.  Ran `python3 backend/manage.py migrate --fake exam 0003_educator_manager_overview_performance_and_more` to apply the migration, using `--fake` to handle pre-existing tables.

### Phase 2: User Interface for Preference - ✅ Completed

*   **Step 2.1: Update Django Admin for `Educator` Model** - ✅ Completed
    *   **File:** `backend/exam/admin.py`
    *   **Action:** Updated the `EducatorAdmin` class to include `separate_biology_subjects` in the `list_display` and `list_filter`.

### Phase 3: Adapted Data Processing Pipeline - ✅ Completed

*   **Step 3.1: Create `get_subject_from_q_paper` in `pdf_processing.py`** - ✅ Completed
    *   **File:** `backend/exam/utils/pdf_processing.py`
    *   **Action:** Added the `get_subject_from_q_paper` function to identify the subject from the question paper using an LLM.

*   **Step 3.2: Create `get_subject_from_answer_key` in `csv_processing.py`** - ✅ Completed
    *   **File:** `backend/exam/utils/csv_processing.py`
    *   **Action:** Added the `get_subject_from_answer_key` function to identify the subject from the answer key file.

*   **Step 3.3: Create `get_subject` in `process_test_data.py`** - ✅ Completed
    *   **File:** `backend/exam/services/process_test_data.py`
    *   **Action:** Added the `get_subject` function to orchestrate subject identification.

*   **Step 3.4: Create `subject_classification.py`** - ✅ Completed
    *   **File:** `backend/exam/utils/subject_classification.py`
    *   **Action:** Created the new file and added the `classify_biology_questions` function.

*   **Step 3.5: Modify `process_test_data.py`** - ✅ Completed
    *   **File:** `backend/exam/services/process_test_data.py`
    *   **Action:** Refactored the `process_test_data` function to handle the "Biology" subject based on the educator's preference.

### Phase 4: Downstream Analysis Modifications - ✅ Completed

*   **Step 4.1: Modify `populate_question.py`** - ✅ Completed
    *   **File:** `backend/exam/ingestions/populate_question.py`
    *   **Action:** Updated the `save_questions_bulk` function to save the `subject` for each question.

*   **Step 4.2: Modify `question_analysis.py`** - ✅ Completed
    *   **File:** `backend/exam/utils/question_analysis.py`
    *   **Action:** Updated the `analyse_questions` function to filter by `subject`.

*   **Step 4.3: Modify `student_analysis.py`** - ✅ Completed
    *   **File:** `backend/exam/utils/student_analysis.py`
    *   **Action:** Updated the `analyse_students` and `fetch_questions` functions to filter by `subject`.

### Final Verification - ✅ Completed

*   **Action:** Ran `python3 backend/manage.py check` to ensure the project is still in a good state. The command returned no issues.