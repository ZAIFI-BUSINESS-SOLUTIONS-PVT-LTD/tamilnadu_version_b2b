#!/usr/bin/env python
"""
Live test script to verify misconception inference logic for a specific student.

Run from backend directory:
    python test_misconception_live.py

This script:
1. Queries StudentResult for wrong answers
2. Fetches question data from QuestionAnalysis
3. Calls the LLM inference function
4. Displays results (does NOT update DB unless --update flag is passed)
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
from exam.llm_call.misconception_inference import infer_misconceptions_batch
from exam.utils.misconception_helper import format_misconception_display


def test_misconception_logic(student_id, class_id, test_num, update_db=False):
    """
    Test misconception inference logic for a student.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
        update_db: If True, update StudentResult records with misconceptions
    """
    print("=" * 80)
    print(f"Testing Misconception Inference")
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
    
    # Step 2: Build question data
    print("📝 Step 2: Building question data for LLM...")
    questions_data = []
    question_num_to_result = {}
    
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
                continue
            
            selected_idx = response.selected_answer
            if selected_idx in ['1', '2', '3', '4']:
                opted_text = getattr(qa, f"option_{selected_idx}", "Unknown")
            else:
                opted_text = "Unknown"
            
            question_data = {
                'question_number': result.question_number,
                'subject': qa.subject,
                'chapter': qa.chapter,
                'topic': qa.topic,
                'question_text': qa.question_text,
                'im_desp': getattr(qa, 'im_desp', ''),
                'option_1': qa.option_1,
                'option_2': qa.option_2,
                'option_3': qa.option_3,
                'option_4': qa.option_4,
                'correct_answer': qa.correct_answer,
                'opted_answer': opted_text
            }
            
            questions_data.append(question_data)
            question_num_to_result[result.question_number] = result
            
            print(f"   ✅ Q{result.question_number}: {qa.subject} - {qa.topic}")
            print(f"      Correct: {qa.correct_answer}, Student chose: {opted_text[:50]}...")
            
        except QuestionAnalysis.DoesNotExist:
            print(f"   ⚠️ QuestionAnalysis not found for Q{result.question_number}")
            continue
        except Exception as e:
            print(f"   ❌ Error preparing Q{result.question_number}: {e}")
            continue
    
    print()
    
    if not questions_data:
        print("❌ No valid question data to send to LLM")
        return
    
    # Step 3: Call LLM
    print(f"🤖 Step 3: Calling Gemini 2.5 Flash with {len(questions_data)} questions...")
    print("   (This may take 10-30 seconds depending on batch size)")
    print()
    
    try:
        misconceptions = infer_misconceptions_batch(questions_data)
    except Exception as e:
        print(f"❌ LLM call failed: {e}")
        import traceback
        traceback.print_exc()
        return
    
    if not misconceptions:
        print("⚠️ LLM returned no misconceptions")
        return
    
    print(f"✅ LLM returned {len(misconceptions)} misconceptions")
    print()
    
    # Step 4: Display results
    print("=" * 80)
    print("RESULTS")
    print("=" * 80)
    print()
    
    for question_num, misconception_data in misconceptions.items():
        question_info = next((q for q in questions_data if q['question_number'] == question_num), None)
        if question_info:
            print(f"Question {question_num}: {question_info['subject']} - {question_info['topic']}")
            print(f"  Type: {misconception_data['type']}")
            print(f"  Text: {misconception_data['text']}")
            print()
    
    # Step 5: Update DB if requested
    if update_db:
        print("=" * 80)
        print("UPDATING DATABASE")
        print("=" * 80)
        print()
        
        from django.db import transaction
        updated_count = 0
        
        with transaction.atomic():
            for question_num, misconception_data in misconceptions.items():
                if question_num in question_num_to_result:
                    result = question_num_to_result[question_num]
                    result.misconception = json.dumps(misconception_data, ensure_ascii=False)
                    result.save(update_fields=['misconception'])
                    updated_count += 1
                    print(f"   ✅ Updated Q{question_num}")
        
        print()
        print(f"✅ Successfully updated {updated_count}/{len(questions_data)} records")
    else:
        print("=" * 80)
        print("DRY RUN - No database updates performed")
        print("Add --update flag to save misconceptions to database")
        print("=" * 80)
    
    print()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Test misconception inference for a student')
    parser.add_argument('--student-id', default='2025300001', help='Student ID')
    parser.add_argument('--class-id', default='ba_rgr_04', help='Class ID')
    parser.add_argument('--test-num', type=int, default=16, help='Test number')
    parser.add_argument('--update', action='store_true', help='Update database with results')
    
    args = parser.parse_args()
    
    print()
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 18 + "MISCONCEPTION INFERENCE LIVE TEST" + " " * 27 + "║")
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
