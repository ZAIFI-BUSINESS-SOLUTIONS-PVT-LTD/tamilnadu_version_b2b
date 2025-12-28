#!/usr/bin/env python
"""
Backfill StudentResult table from existing StudentResponse and QuestionAnalysis data.
This populates question-level correctness data for all historical tests.

Usage:
  python backend/backfill_student_results.py [--class-id CLASS_ID] [--test-num TEST_NUM] [--dry-run]
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inzighted.settings')
django.setup()

from django.db import transaction
from exam.models.result import StudentResult
from exam.models.response import StudentResponse
from exam.models.analysis import QuestionAnalysis
from exam.models.student import Student
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def backfill_student_results(class_id=None, test_num=None, dry_run=False):
    """
    Backfill StudentResult table from StudentResponse + QuestionAnalysis.
    
    Args:
        class_id: Optional class filter
        test_num: Optional test filter
        dry_run: If True, don't save to database
    """
    # Build query filters
    filters = {}
    if class_id:
        filters['class_id'] = class_id
    if test_num:
        filters['test_num'] = test_num
    
    # Get all student responses
    responses = StudentResponse.objects.filter(**filters).select_related()
    
    if not responses.exists():
        logger.warning(f"No StudentResponse records found with filters: {filters}")
        return
    
    logger.info(f"Found {responses.count()} StudentResponse records to process")
    
    # Group by student, class, test
    processed_count = 0
    skipped_count = 0
    error_count = 0
    
    # Get distinct combinations
    combos = responses.values('student_id', 'class_id', 'test_num').distinct()
    
    for combo in combos:
        student_id = combo['student_id']
        cls_id = combo['class_id']
        tst_num = combo['test_num']
        
        logger.info(f"Processing student={student_id}, class={cls_id}, test={tst_num}")
        
        # Get all responses for this combo
        student_responses = StudentResponse.objects.filter(
            student_id=student_id,
            class_id=cls_id,
            test_num=tst_num
        )
        
        for response in student_responses:
            try:
                # Check if already exists
                if StudentResult.objects.filter(
                    student_id=student_id,
                    class_id=cls_id,
                    test_num=tst_num,
                    question_number=response.question_number
                ).exists():
                    skipped_count += 1
                    continue
                
                # Get question analysis
                try:
                    qa = QuestionAnalysis.objects.get(
                        class_id=cls_id,
                        test_num=tst_num,
                        question_number=response.question_number
                    )
                except QuestionAnalysis.DoesNotExist:
                    logger.warning(f"QuestionAnalysis not found for Q{response.question_number} test {tst_num}")
                    error_count += 1
                    continue
                
                # Determine correctness and attempt status
                selected_answer = response.selected_answer
                was_attempted = False
                is_correct = False
                
                if selected_answer and str(selected_answer).strip() and selected_answer in ['1', '2', '3', '4']:
                    was_attempted = True
                    idx = int(selected_answer)
                    opted = qa.__dict__.get(f"option_{idx}")
                    is_correct = (qa.correct_answer == opted)
                
                # Create StudentResult record
                if not dry_run:
                    StudentResult.objects.create(
                        student_id=student_id,
                        class_id=cls_id,
                        test_num=tst_num,
                        question_number=response.question_number,
                        is_correct=is_correct,
                        was_attempted=was_attempted,
                        subject=qa.subject,
                        chapter=qa.chapter,
                        topic=qa.topic
                    )
                
                processed_count += 1
                
                if processed_count % 100 == 0:
                    logger.info(f"Processed {processed_count} records...")
                    
            except Exception as e:
                logger.error(f"Error processing Q{response.question_number}: {e}")
                error_count += 1
                continue
    
    logger.info(f"""
╔═══════════════════════════════════════╗
║     Backfill Summary                  ║
╠═══════════════════════════════════════╣
║ Processed: {processed_count:>6}                   ║
║ Skipped:   {skipped_count:>6}                   ║
║ Errors:    {error_count:>6}                   ║
║ Dry Run:   {str(dry_run):>6}                   ║
╚═══════════════════════════════════════╝
    """)
    
    return processed_count, skipped_count, error_count


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Backfill StudentResult table')
    parser.add_argument('--class-id', help='Filter by class ID')
    parser.add_argument('--test-num', type=int, help='Filter by test number')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (don\'t save)')
    
    args = parser.parse_args()
    
    logger.info("Starting StudentResult backfill...")
    logger.info(f"Filters: class_id={args.class_id}, test_num={args.test_num}, dry_run={args.dry_run}")
    
    backfill_student_results(
        class_id=args.class_id,
        test_num=args.test_num,
        dry_run=args.dry_run
    )
    
    logger.info("Backfill complete!")
