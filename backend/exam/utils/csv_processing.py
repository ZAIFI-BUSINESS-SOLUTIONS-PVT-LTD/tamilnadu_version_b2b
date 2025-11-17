import csv
import re
import pandas as pd
from datetime import datetime
from django.contrib.auth.hashers import make_password
from exam.models.student import Student
from io import TextIOWrapper
from django.core.files.storage import default_storage
from exam.models.test_status import TestProcessingStatus
import logging
import os
import magic

logger = logging.getLogger(__name__)


def process_student_csv(csv_path, class_id):
    """
    Reads a student CSV file and returns a list of Student objects.

    Args:
        csv_path (str): Path to the saved student CSV file.
        class_id (str): Class ID to assign to students.

    Returns:
        list: List of Student objects ready for bulk insertion.
    """
    
    students = []

    try:
        with default_storage.open(csv_path, 'rb') as f:
            csvfile = TextIOWrapper(f, encoding='utf-8-sig')
            reader = csv.DictReader(csvfile)

            for row in reader:
                try:
                    row_dict = {k.strip().lower(): v.strip() for k, v in dict(row).items() if k and v}

                    # Required fields
                    required_fields = {"id", "name", "dob"}

                    # Check if all required fields are present
                    if not required_fields.issubset(row_dict.keys()):
                        missing_fields = required_fields - row_dict.keys()
                        raise ValueError(f"Missing required fields in CSV: {', '.join(missing_fields)}")

                    raw_dob = re.sub(r"[“”]", "", row_dict["dob"]).strip()
                    dob_formatted = datetime.strptime(raw_dob, "%d-%m-%Y").strftime("%Y-%m-%d")

                    # Generate default password (First 4 letters of name + Year of DOB)
                    pas = row_dict["name"][:4].upper()
                    wd = str(datetime.strptime(dob_formatted, "%Y-%m-%d").strftime("%d%m"))
                    name=row_dict["name"]
                    
                    paswd = pas + wd
                    neo = str(row_dict["id"])
                    neo4j = "db"+neo+class_id 
                    # making neo4j db name alpha num 
                    neo4j = re.sub(r'[^A-Za-z0-9]', '', neo4j)
                    #first letter only upper case
                    name = re.sub(r'\b(\w)(\w*)', lambda m: m.group(1).upper() + m.group(2).lower(), name) 

                    
                    student = Student(
                        student_id=row_dict["id"],
                        name=name,
                        dob=dob_formatted,
                        class_id=class_id,
                        neo4j_db=neo4j,
                        password=make_password(paswd), # Hash password before saving
                        independant=False
                    )

                    students.append(student)

                except Exception as e:
                    logger.error(f"❌ Skipping row due to error: {row_dict} → {str(e)}")
                    #print(f"❌ Skipping row due to error: {row_dict} → {str(e)}")
                    continue
        logger.info(f"✅ Successfully processed {len(students)} students from {csv_path}")
        #print(f"✅ Successfully processed {len(students)} students from {csv_path}")
        return students

    except Exception as e:
        logger.error(f"❌ Error reading CSV {csv_path}: {str(e)}")
        #print(f"❌ Error reading CSV {csv_path}: {str(e)}")
        return []



def find_actual_file(base_path):
    """
    Given a base path (possibly without extension), find the actual file with a supported extension.
    Returns the full path to the file, or None if not found.
    """
    supported_exts = ['.csv', '.xls', '.xlsx']
    if default_storage.exists(base_path):
        return base_path
    dir_name = os.path.dirname(base_path)
    base_name = os.path.basename(base_path)
    for ext in supported_exts:
        candidate = os.path.join(dir_name, base_name + ext)
        if default_storage.exists(candidate):
            # Optionally, use magic to confirm type
            with default_storage.open(candidate, 'rb') as f:
                mime = magic.from_buffer(f.read(2048), mime=True)
                if mime in ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
                    return candidate
    return None


def get_answer_dict(path):
    """
    Return {question_number(str): answer(str 1-4)} for CSV/XLS/XLSX with
    'Question Number' and 'Answer' cols (case/space agnostic).
    Handles answers as A-D, 1-4, 1.0-4.0.
    """
    actual_path = find_actual_file(path)
    if not actual_path:
        logger.error(f"[get_answer_dict] ❌ No valid answer key file found for {path}")
        return {}
    try:
        ext = os.path.splitext(actual_path)[1].lower()
        reader_map = {
            ".csv": lambda f: pd.read_csv(TextIOWrapper(f, encoding="utf-8-sig")),
            ".xls": pd.read_excel,
            ".xlsx": pd.read_excel,
        }
        with default_storage.open(actual_path, "rb") as f:
            if ext in reader_map:
                df = reader_map[ext](f)
            else:
                logger.error(f"[get_answer_dict] ❌ Unsupported file extension: {ext}")
                return {}
        df.columns = df.columns.str.strip().str.lower()
        if {"question number", "answer"} - set(df.columns):
            raise ValueError("File must contain 'Question Number' and 'Answer' columns")
        df = df.dropna(subset=["question number", "answer"])

        amap = {"a": "1", "b": "2", "c": "3", "d": "4",
                "1": "1", "2": "2", "3": "3", "4": "4"}

        return {
            str(int(q)): amap.get(
                (str(a).strip().lower().rstrip("0").rstrip(".")),  # '3.0'→'3'
                str(a).strip()
            )
            for q, a in zip(df["question number"], df["answer"])
        }
    except Exception as e:
        logger.error(f"[get_answer_dict] ❌ {e}")
        return {}


def get_student_response(answer_sheet_path, class_id):
    """
    Parses AnswerSheet CSV/XLS/XLSX and returns answers for students in the given class_id only.
    """
    actual_path = find_actual_file(answer_sheet_path)
    if not actual_path:
        logger.error(f"[get_student_response] ❌ No valid answer sheet file found for {answer_sheet_path}")
        return []
    answer_map = {
        'A': '1', 'B': '2', 'C': '3', 'D': '4',
        1: '1', 2: '2', 3: '3', 4: '4', '1': '1', '2': '2', '3': '3', '4': '4'
    }
    data = []

    # 1. Get student IDs for class_id
    students_qs = Student.objects.filter(class_id=class_id)
    valid_student_ids = set(str(s.student_id) for s in students_qs)

    try:
        ext = os.path.splitext(actual_path)[1].lower()
        reader_map = {
            ".csv": lambda f: list(csv.reader(TextIOWrapper(f, newline='', encoding='utf-8-sig'))),
            ".xls": lambda f: [pd.read_excel(f).columns.tolist()] + pd.read_excel(f).values.tolist(),
            ".xlsx": lambda f: [pd.read_excel(f).columns.tolist()] + pd.read_excel(f).values.tolist(),
        }
        with default_storage.open(actual_path, 'rb') as f:
            if ext in reader_map:
                rows = reader_map[ext](f)
            else:
                logger.error(f"[get_student_response] ❌ Unsupported file extension: {ext}")
                return []

        if not rows or len(rows) < 2:
            logger.warning("❌ Sheet is empty or invalid.")
            return []

        # 2. Extract all student IDs from header row, skipping the first column
        csv_student_ids = [str(s).strip() for s in rows[0][1:]]
        # 3. Find indices for student IDs that match the valid_student_ids set
        filtered_indices = [i for i, sid in enumerate(csv_student_ids) if sid in valid_student_ids]
        filtered_student_ids = [csv_student_ids[i] for i in filtered_indices]

        for row in rows[1:]:
            if not row or len(row) < 2:
                continue
            question_number = str(row[0]).strip()
            if not question_number.isdigit():
                continue
            question_number = int(question_number)
            answers = row[1:]
            for idx, student_id in zip(filtered_indices, filtered_student_ids):
                if idx >= len(answers):
                    continue
                raw_answer = answers[idx]
                if pd.isna(raw_answer) or raw_answer == '' or str(raw_answer).strip() == '':
                    mapped_answer = None
                    logger.info(f"Empty answer found: {raw_answer}")
                else:
                    # Debug log the raw answer
                    logger.info(f"Processing raw answer: {raw_answer} of type {type(raw_answer)}")
                    
                    # Handle both numeric and string answers
                    if isinstance(raw_answer, (int, float)):
                        # Direct mapping for numbers
                        int_val = int(raw_answer)
                        mapped_answer = answer_map.get(int_val, None)
                        logger.info(f"Numeric answer: {raw_answer} -> {mapped_answer}")
                    else:
                        # String processing for letter answers
                        answer = str(raw_answer).strip().upper()
                        answer = answer.rstrip('0').rstrip('.') if '.' in answer else answer
                        mapped_answer = answer_map.get(answer, None)
                        logger.info(f"String answer: {raw_answer} -> {mapped_answer}")
                    
                    # Log the final mapped answer
                    logger.info(f"Final mapped answer: {mapped_answer}")
                data.append({
                    "student_id": student_id,
                    "question_number": question_number,
                    "selected_answer": mapped_answer
                })
    except Exception as e:
        logger.error(f"❌ Error reading answer sheet: {e}")
    return data

def get_subject_from_answer_key(path: str):
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