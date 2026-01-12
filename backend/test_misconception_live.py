#!/usr/bin/env python
"""
Live test script to verify DB-driven misconception population for a specific student.

Run from backend directory:
    python test_misconception_live.py

This script:
1. Queries StudentResult for wrong answers
2. Fetches pre-authored misconception data from QuestionAnalysis
3. Displays what would be populated (does NOT update DB unless --update flag is passed)
"""

import os
import sys
import django
import json

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inzighted.settings')
django.setup()

from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis
from exam.models.response import StudentResponse
from exam.utils.misconception_helper import format_misconception_display


def test_misconception_logic(student_id, class_id, test_num, update_db=False):
    """
    Test DB-driven misconception population for a student.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
        update_db: If True, update StudentResult records with misconceptions
    """
    print("=" * 80)
    print(f"Testing DB-Driven Misconception Population")
    print(f"Student: {student_id}, Class: {class_id}, Test: {test_num}")
    print("=" * 80)
    print()
    
    # Step 1: Get wrong answers
    print("📋 Step 1: Fetching wrong answers from StudentResult...")
    wrong_results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id,
        test_num=test_num,
        was_attempted=True,
        is_correct=False
    )
    
    if not wrong_results.exists():
        print(f"✅ No wrong answers found for student {student_id} in test {test_num}")
        print("   (Either student got 100% or hasn't taken the test)")
        return
    
    print(f"   Found {wrong_results.count()} wrong answers")
    print()
    
    # Step 2: Process each wrong answer and fetch DB misconceptions
    print("📝 Step 2: Fetching pre-authored misconceptions from QuestionAnalysis...")
    misconceptions_found = {}
    skipped = []
    
    for result in wrong_results:
        try:
            qa = QuestionAnalysis.objects.get(
                class_id=class_id,
                test_num=test_num,
                question_number=result.question_number
            )
            
            response = StudentResponse.objects.filter(
                student_id=student_id,
                class_id=class_id,
                test_num=test_num,
                question_number=result.question_number
            ).first()
            
            if not response or not response.selected_answer:
                print(f"   ⚠️ No response found for Q{result.question_number}, skipping")
                skipped.append(result.question_number)
                continue
            
            selected_idx = response.selected_answer
            if selected_idx not in ['1', '2', '3', '4']:
                print(f"   ⚠️ Invalid selected answer '{selected_idx}' for Q{result.question_number}, skipping")
                skipped.append(result.question_number)
                continue
            
            # Fetch pre-authored misconception
            misconception_type = getattr(qa, f"option_{selected_idx}_type", None)
            misconception_text = getattr(qa, f"option_{selected_idx}_misconception", None)
            
            if misconception_type and misconception_text:
                misconceptions_found[result.question_number] = {
                    'type': misconception_type.strip(),
                    'text': misconception_text.strip(),
                    'subject': qa.subject,
                    'topic': qa.topic,
                    'selected_option': selected_idx
                }
                print(f"   ✅ Q{result.question_number}: {qa.subject} - {qa.topic}")
                print(f"      Selected option: {selected_idx}")
                print(f"      Type: {misconception_type}")
                print(f"      Text: {misconception_text[:80]}...")
            else:
                print(f"   ⚠️ Q{result.question_number}: Missing misconception data for option {selected_idx}")
                skipped.append(result.question_number)
            
        except QuestionAnalysis.DoesNotExist:
            print(f"   ⚠️ QuestionAnalysis not found for Q{result.question_number}")
            skipped.append(result.question_number)
            continue
        except Exception as e:
            print(f"   ❌ Error processing Q{result.question_number}: {e}")
            skipped.append(result.question_number)
            continue
    
    print()
    
    if not misconceptions_found:
        print("❌ No valid misconception data found in QuestionAnalysis")
        return
    
    print(f"✅ Found {len(misconceptions_found)} misconceptions from database")
    if skipped:
        print(f"⚠️ Skipped {len(skipped)} questions: {skipped}")
    print()
    
    # Step 3: Display or update
    if update_db:
        print("=" * 80)
        print("UPDATING DATABASE")
        print("=" * 80)
        print()
        
        print("💾 Step 3: Updating database...")
        print()
        
        from django.db import transaction
        updated_count = 0
        
        with transaction.atomic():
            for question_num, data in misconceptions_found.items():
                result = StudentResult.objects.get(
                    student_id=student_id,
                    class_id=class_id,
                    test_num=test_num,
                    question_number=question_num
                )
                
                misconception_json = json.dumps({
                    'type': data['type'],
                    'text': data['text']
                }, ensure_ascii=False)
                
                result.misconception = misconception_json
                result.save(update_fields=['misconception'])
                updated_count += 1
                print(f"   ✅ Updated Q{question_num}")
        
        print()
        print(f"✅ Successfully updated {updated_count}/{len(misconceptions_found)} records")
    else:
        print("=" * 80)
        print("DRY RUN - No database updates performed")
        print("Add --update flag to save misconceptions to database")
        print("=" * 80)
    
    print()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Test DB-driven misconception population for a student')
    parser.add_argument('--student-id', default='2025300001', help='Student ID')
    parser.add_argument('--class-id', default='ba_rgr_04', help='Class ID')
    parser.add_argument('--test-num', type=int, default=16, help='Test number')
    parser.add_argument('--update', action='store_true', help='Update database with results')
    
    args = parser.parse_args()
    
    print()
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 15 + "DB-DRIVEN MISCONCEPTION POPULATION TEST" + " " * 23 + "║")
    print("╚" + "=" * 78 + "╝")
    print()
    
    try:
        test_misconception_logic(
            args.student_id,
            args.class_id,
            args.test_num,
            args.update
        )
        
        print()
        print("✅ Test completed successfully")
        print()
        
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
