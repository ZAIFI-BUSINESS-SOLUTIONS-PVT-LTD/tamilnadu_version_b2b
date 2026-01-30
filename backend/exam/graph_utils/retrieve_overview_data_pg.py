"""
PostgreSQL-based overview data retrieval
Replaces Neo4j graph queries with PostgreSQL table queries.
"""

import pandas as pd
import numpy as np
from django.db.models import Count, Sum, Case, When, IntegerField, FloatField, F, Q
from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis
from exam.models.response import StudentResponse


def get_overview_data_pg(student_id, class_id):
    """
    PostgreSQL version of get_overview_data
    
    Args:
        student_id (str): Student identifier
        class_id (str): Class identifier
    
    Returns:
        tuple: (KS_data, AI_data, QR_data, CV_data, PT, SA)
    """
    KS_data = get_key_strength_data_pg(student_id, class_id)
    AI_data = get_area_for_improvement_data_pg(student_id, class_id)
    QR_data = AI_data  # Quick Revision = Improvement Questions
    CV_data = get_consistency_vulnerability_data_pg(student_id, class_id)
    PT = get_performance_trend_graph_pg(student_id, class_id)
    SA = get_test_wise_subject_score_pg(student_id, class_id)

    return KS_data, AI_data, QR_data, CV_data, PT, SA


def get_key_strength_data_pg(student_id, class_id):
    """
    Get top performing chapters with question metadata.
    Returns top 5 chapters per subject based on weighted score.
    """
    # Calculate weighted scores for chapters
    chapter_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('subject', 'chapter').annotate(
        total_questions=Count('question_number'),
        correct_questions=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    # Calculate weighted scores and organize by subject
    subject_to_top_chapters = {}
    
    for result in chapter_results:
        subject = result['subject']
        chapter = result['chapter']
        total = result['total_questions']
        correct = result['correct_questions']
        
        if total > 0:
            accuracy = correct / total
            weighted_score = accuracy * np.log10(total + 1)
            
            if subject not in subject_to_top_chapters:
                subject_to_top_chapters[subject] = []
            
            subject_to_top_chapters[subject].append({
                'chapter': chapter,
                'score': weighted_score
            })
    
    # Sort and take top 5 per subject
    for subject in subject_to_top_chapters:
        subject_to_top_chapters[subject] = sorted(
            subject_to_top_chapters[subject],
            key=lambda x: x['score'],
            reverse=True
        )[:5]
    
    # Get question metadata for top chapters
    result = {"subjects": []}
    
    for subject, chapters in subject_to_top_chapters.items():
        chapter_names = [ch['chapter'] for ch in chapters]
        
        # Get correct questions for these chapters
        correct_questions = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            subject=subject,
            chapter__in=chapter_names,
            is_correct=True
        ).values_list('test_num', 'question_number')
        
        # Organize questions by chapter
        structured = {}
        for test_num, q_num in correct_questions:
            try:
                qa = QuestionAnalysis.objects.get(
                    class_id=class_id,
                    test_num=test_num,
                    question_number=q_num
                )
                
                response = StudentResponse.objects.filter(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=test_num,
                    question_number=q_num
                ).first()
                
                selected_answer = response.selected_answer if response else None
                
                # Get feedback and actual option text
                feedback = ""
                actual_option_text = ""
                if selected_answer:
                    option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                    option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                    feedback = getattr(qa, f'option_{option_num}_feedback', '')
                    actual_option_text = getattr(qa, f'option_{option_num}', '')
                
                q = {
                    "n": qa.question_number,
                    "txt": qa.question_text,
                    "type": qa.typeOfquestion,
                    "ans": actual_option_text,
                    "img": qa.im_desp or '',
                    "fb": feedback
                }
                
                chapter = qa.chapter
                structured.setdefault(chapter, []).append(q)
            except QuestionAnalysis.DoesNotExist:
                continue
        
        # Build response structure
        sub_entry = {"name": subject, "top_chapters": []}
        for chapter in chapter_names:
            qlist = structured.get(chapter, [])
            sub_entry["top_chapters"].append({"name": chapter, "questions": qlist})
        result["subjects"].append(sub_entry)
    
    return result


def get_area_for_improvement_data_pg(student_id, class_id):
    """
    Get mid-range chapters for improvement.
    Returns middle 10 chapters per subject based on weighted score.
    """
    # Calculate weighted scores for chapters
    # Match Neo4j: WHERE q.optedAnswer IS NOT NULL means was_attempted=True
    chapter_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        was_attempted=True  # Only attempted questions like Neo4j
    ).values('subject', 'chapter').annotate(
        total_questions=Count('question_number'),
        correct_questions=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    )
    
    # Calculate weighted scores and organize by subject
    subject_to_chapters = {}
    
    for result in chapter_results:
        subject = result['subject']
        chapter = result['chapter']
        total = result['total_questions']
        correct = result['correct_questions']
        
        if total > 0:
            accuracy = correct / total
            weighted_score = accuracy * np.log10(total + 1)
            
            if subject not in subject_to_chapters:
                subject_to_chapters[subject] = []
            
            subject_to_chapters[subject].append({
                'chapter': chapter,
                'score': weighted_score
            })
    
    # Get middle chapters (improvement zone)
    for subject in subject_to_chapters:
        sorted_chapters = sorted(
            subject_to_chapters[subject],
            key=lambda x: x['score'],
            reverse=True
        )
        
        total = len(sorted_chapters)
        mid = total // 2
        start = max(mid - 5, 0)
        end = min(mid + 5, total)
        
        subject_to_chapters[subject] = [ch['chapter'] for ch in sorted_chapters[start:end]]
    
    # Get question metadata for improvement chapters
    response = {"subjects": []}
    
    for subject, chapter_names in subject_to_chapters.items():
        # Get correct questions for these chapters (for practice)
        correct_questions = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            subject=subject,
            chapter__in=chapter_names,
            is_correct=True
        ).values_list('test_num', 'question_number')
        
        # Organize questions by chapter
        structured = {}
        for test_num, q_num in correct_questions:
            try:
                qa = QuestionAnalysis.objects.get(
                    class_id=class_id,
                    test_num=test_num,
                    question_number=q_num
                )
                
                response_obj = StudentResponse.objects.filter(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=test_num,
                    question_number=q_num
                ).first()
                
                selected_answer = response_obj.selected_answer if response_obj else None
                
                # Get feedback and actual option text
                feedback = ""
                actual_option_text = ""
                if selected_answer:
                    option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                    option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                    feedback = getattr(qa, f'option_{option_num}_feedback', '')
                    actual_option_text = getattr(qa, f'option_{option_num}', '')
                
                q = {
                    "n": qa.question_number,
                    "txt": qa.question_text,
                    "type": qa.typeOfquestion,
                    "ans": actual_option_text,
                    "img": qa.im_desp or '',
                    "fb": feedback
                }
                
                chapter = qa.chapter
                structured.setdefault(chapter, []).append(q)
            except QuestionAnalysis.DoesNotExist:
                continue
        
        # Build response structure
        subj_data = {"name": subject, "chapters": []}
        for chapter in chapter_names:
            qlist = structured.get(chapter, [])
            subj_data["chapters"].append({"name": chapter, "questions": qlist})
        response["subjects"].append(subj_data)
    
    return response


def get_consistency_vulnerability_data_pg(student_id, class_id):
    """
    Get chapters with least consistent performance across tests.
    Uses standard deviation of accuracy to measure consistency.
    """
    # Get test-wise chapter accuracy
    # Match Neo4j: WHERE q.optedAnswer IS NOT NULL means was_attempted=True  
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        was_attempted=True  # Only attempted questions like Neo4j
    ).values('test_num', 'subject', 'chapter').annotate(
        total_questions=Count('question_number'),
        correct_questions=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('subject', 'chapter', 'test_num')
    
    # Build DataFrame for easier processing
    records = []
    for r in results:
        if r['total_questions'] > 0:
            accuracy = r['correct_questions'] / r['total_questions']
            records.append({
                'test_name': f"Test{r['test_num']}",
                'subject': r['subject'],
                'chapter': r['chapter'],
                'accuracy': accuracy
            })
    
    if not records:
        return {}
    
    accuracy_df = pd.DataFrame(records)
    
    # Get all questions for subjects/chapters with their correctness status
    question_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values_list('test_num', 'subject', 'chapter', 'question_number', 'is_correct', 'was_attempted')
    
    questions_dict = {}
    for test_num, subject, chapter, q_num, is_correct, was_attempted in question_results:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            )
            
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=q_num
            ).first()
            
            selected_answer = response.selected_answer if response else None
            
            # Get feedback, misconception, and actual option text
            feedback = ""
            err = ""
            actual_option_text = ""
            if selected_answer:
                option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
                option_num = option_map.get(str(selected_answer).strip().upper(), '1')
                feedback = getattr(qa, f'option_{option_num}_feedback', '')
                actual_option_text = getattr(qa, f'option_{option_num}', '')
                mis_type = getattr(qa, f'option_{option_num}_type', '')
                mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
                if mis_type and mis_desc:
                    err = f"{mis_type}: {mis_desc}"
                elif mis_type:
                    err = mis_type
            
            question_obj = {
                "n": qa.question_number,
                "txt": qa.question_text,
                "type": qa.typeOfquestion,
                "ans": actual_option_text,
                "img": qa.im_desp or '',
                "fb": feedback,
                "err": err
            }
            
            # Group by (subject, chapter) and status (correct/incorrect/skipped)
            key = (subject, chapter)
            if key not in questions_dict:
                questions_dict[key] = {
                    "correct": [],
                    "incorrect": [],
                    "skipped": []
                }
            
            # Categorize question
            if is_correct:
                questions_dict[key]["correct"].append(question_obj)
            elif was_attempted:
                questions_dict[key]["incorrect"].append(question_obj)
            else:
                questions_dict[key]["skipped"].append(question_obj)
                
        except QuestionAnalysis.DoesNotExist:
            continue
    
    # Calculate consistency scores
    response = {"subjects": []}
    
    for subject, group in accuracy_df.groupby("subject"):
        chapter_scores = []
        
        for chapter, ch_group in group.groupby("chapter"):
            accuracies = ch_group["accuracy"].tolist()
            
            if len(accuracies) < 2:
                continue
            
            avg = np.mean(accuracies)
            std = np.std(accuracies)
            score = avg / (1 + std) if std > 0 else avg
            
            chapter_scores.append({"name": chapter, "score": round(score, 4)})
        
        # Get 5 least consistent chapters
        least_consistent = sorted(chapter_scores, key=lambda x: x["score"])[:5]
        
        subject_data = {"name": subject, "chapters": []}
        
        for ch in least_consistent:
            chapter_name = ch["name"]
            questions_data = questions_dict.get((subject, chapter_name), {
                "correct": [],
                "incorrect": [],
                "skipped": []
            })
            
            subject_data["chapters"].append({
                "name": chapter_name,
                "score": ch["score"],
                "correct_questions": questions_data["correct"],
                "incorrect_questions": questions_data["incorrect"],
                "skipped_questions": questions_data["skipped"]
            })
        
        response["subjects"].append(subject_data)
    
    return response


def get_performance_trend_graph_pg(student_id, class_id):
    """
    Returns subject-wise test performance trends.
    Match Neo4j scoring: correct=4, incorrect=-1, skipped=0
    Output: {"subjects": [{"name": "Physics", "tests": [65, 72, 40, 80]}, ...]}
    """
    # Match Neo4j query exactly: WHERE q.optedAnswer IS NOT NULL filters to attempted
    # Scoring: isCorrect=true -> 4, isCorrect=false -> -1, else 0
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num', 'subject').annotate(
        score=Sum(
            Case(
                When(is_correct=True, was_attempted=True, then=4),
                When(is_correct=False, was_attempted=True, then=-1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('subject', 'test_num')
    
    # Organize by subject
    subject_scores = {}
    for r in results:
        subject = r['subject']
        score = r['score']
        
        if subject not in subject_scores:
            subject_scores[subject] = []
        subject_scores[subject].append(score)
    
    output = {
        "subjects": [
            {"name": subject, "tests": scores}
            for subject, scores in subject_scores.items()
        ]
    }
    
    return output


def get_test_wise_subject_score_pg(student_id, class_id):
    """
    Returns test-wise subject score matrix with counts.
    Rows: Test Names, Columns: Subjects + count columns
    """
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num', 'subject').annotate(
        score=Sum(
            Case(
                When(is_correct=True, then=4),
                When(Q(is_correct=False) & Q(was_attempted=True), then=-1),
                When(Q(is_correct=False) & Q(was_attempted=False), then=0),
                default=0,
                output_field=IntegerField()
            )
        ),
        correct_count=Sum(
            Case(
                When(is_correct=True, then=1),
                default=0,
                output_field=IntegerField()
            )
        ),
        incorrect_count=Sum(
            Case(
                When(Q(is_correct=False) & Q(was_attempted=True), then=1),
                default=0,
                output_field=IntegerField()
            )
        ),
        skipped_count=Sum(
            Case(
                When(Q(is_correct=False) & Q(was_attempted=False), then=1),
                default=0,
                output_field=IntegerField()
            )
        )
    ).order_by('test_num', 'subject')
    
    # Build records - use was_attempted=False count as unattempted
    records = []
    for r in results:
        test_num = r['test_num']
        subject = r['subject']
        
        # skipped_count represents unattempted questions (was_attempted=False)
        records.append({
            'TestName': f"Test{test_num}",
            'SubjectName': subject,
            'Score': r['score'],
            'CorrectCount': r['correct_count'],
            'IncorrectCount': r['incorrect_count'],
            'UnattemptedCount': r['skipped_count']
        })
    
    if not records:
        return []
    
    df = pd.DataFrame(records)
    
    # Pivot with multiple value columns
    pivot = df.pivot_table(
        index="TestName",
        columns="SubjectName",
        values=["Score", "CorrectCount", "IncorrectCount", "UnattemptedCount"],
        aggfunc="sum",
        fill_value=0,
    )
    
    # Get subjects in stable order
    subjects = sorted(df["SubjectName"].unique())
    
    # Build flattened DataFrame
    out_df = pd.DataFrame(index=pivot.index)
    out_df["Test"] = pivot.index
    
    def _series(metric, subject):
        try:
            return pivot[(metric, subject)]
        except Exception:
            return pd.Series(0, index=pivot.index)
    
    for subj in subjects:
        score_s = _series("Score", subj).astype(float).fillna(0)
        correct_s = _series("CorrectCount", subj).fillna(0)
        incorrect_s = _series("IncorrectCount", subj).fillna(0)
        unattempted_s = _series("UnattemptedCount", subj).fillna(0)
        
        # Original subject column for Score
        out_df[subj] = score_s
        out_df[f"{subj}__correct"] = correct_s.astype(int)
        out_df[f"{subj}__incorrect"] = incorrect_s.astype(int)
        out_df[f"{subj}__unattempted"] = unattempted_s.astype(int)
    
    out_df = out_df.reset_index(drop=True)
    return out_df.to_dict(orient="records")
