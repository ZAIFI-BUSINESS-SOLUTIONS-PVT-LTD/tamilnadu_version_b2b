"""
Debug script to trace student analysis for KA04 in be_kad_01, test 1
Run this in Django shell: python manage.py shell < debug_student_analysis.py
Or: python manage.py shell
Then: exec(open('debug_student_analysis.py').read())
"""

import pandas as pd
from exam.models import Student, QuestionAnalysis, StudentResponse, Test, Result
from exam.utils.student_analysis import fetch_questions, fetch_student_responses

# Target student details
STUDENT_ID = "KA04"
CLASS_ID = "be_kad_01"
TEST_NUM = 1

print("=" * 80)
print(f"DEBUGGING STUDENT ANALYSIS FOR: {STUDENT_ID}, Class: {CLASS_ID}, Test: {TEST_NUM}")
print("=" * 80)

# Step 1: Fetch student and test info
print("\n[STEP 1] Fetching Student and Test Info...")
try:
    student = Student.objects.get(student_id=STUDENT_ID, class_id=CLASS_ID)
    print(f"✓ Student found: {student.name}, DB: {student.neo4j_db}")
except Student.DoesNotExist:
    print(f"✗ Student {STUDENT_ID} not found!")
    exit()

try:
    test = Test.objects.get(class_id=CLASS_ID, test_num=TEST_NUM)
    print(f"✓ Test found: Test {test.test_num}, Date: {test.date}")
except Test.DoesNotExist:
    print(f"✗ Test {TEST_NUM} not found!")
    exit()

# Step 2: Check what subjects exist in QuestionAnalysis
print("\n[STEP 2] Checking Subjects in QuestionAnalysis...")
subjects = list(QuestionAnalysis.objects.filter(
    class_id=CLASS_ID,
    test_num=TEST_NUM
).values_list('subject', flat=True).distinct())
print(f"Subjects found: {subjects}")

# Get question count per subject
for subject in subjects:
    count = QuestionAnalysis.objects.filter(
        class_id=CLASS_ID,
        test_num=TEST_NUM,
        subject=subject
    ).count()
    print(f"  - {subject}: {count} questions")

# Step 3: Fetch student responses
print("\n[STEP 3] Fetching Student Responses...")
response_map = fetch_student_responses(STUDENT_ID, CLASS_ID, TEST_NUM)
print(f"Total responses: {len(response_map)}")
print(f"Response map key types: {[type(k) for k in list(response_map.keys())[:5]]}")
print(f"Sample responses (first 10):")
for qnum in sorted(list(response_map.keys())[:10], key=lambda x: int(x) if str(x).isdigit() else 0):
    print(f"  Q{qnum}: {response_map[qnum]}")

# Step 4: Fetch questions from QuestionAnalysis
print("\n[STEP 4] Fetching Questions from QuestionAnalysis...")
all_questions = []
for subject in subjects:
    subject_questions = fetch_questions(CLASS_ID, TEST_NUM, subject)
    print(f"\n  Fetched {len(subject_questions)} questions for {subject}")
    all_questions.extend(subject_questions)
    
    # Show first question for each subject
    if subject_questions:
        q = subject_questions[0]
        print(f"    Sample Q{q['question_number']}: subject={q.get('subject')}")

print(f"\nTotal questions combined: {len(all_questions)}")
print(f"Question number types: {[type(q['question_number']) for q in all_questions[:5]]}")

# Step 5: Check for duplicate question numbers
print("\n[STEP 5] Checking for Duplicate Question Numbers...")
qnums = [q['question_number'] for q in all_questions]
duplicates = [qn for qn in set(qnums) if qnums.count(qn) > 1]
if duplicates:
    print(f"✗ WARNING: Found {len(duplicates)} duplicate question numbers!")
    print(f"  Duplicates: {sorted(duplicates)[:10]}")
    for dup_qnum in sorted(duplicates)[:3]:
        dup_questions = [q for q in all_questions if q['question_number'] == dup_qnum]
        print(f"\n  Q{dup_qnum} appears {len(dup_questions)} times:")
        for q in dup_questions:
            print(f"    - Subject: {q.get('subject')}, Correct: {q['correct_answer'][:30]}...")
else:
    print("✓ No duplicate question numbers found")

# Step 6: Manually run the analysis logic for Physics questions only
print("\n[STEP 6] Analyzing Physics Questions (Manual Trace)...")
physics_questions = [q for q in all_questions if q.get('subject') == 'Physics']
print(f"Physics questions: {len(physics_questions)}")

physics_analysis = []
physics_correct_count = 0
physics_attempted_count = 0

for q in physics_questions:
    qnum = q['question_number']
    # This mimics the analyzer logic
    selected = response_map.get(str(qnum))  # Convert to string for lookup
    
    if selected in ['1', '2', '3', '4']:
        idx = int(selected)
        opted = q.get(f"option_{idx}")
        is_correct = q['correct_answer'] == opted
        physics_attempted_count += 1
        if is_correct:
            physics_correct_count += 1
    else:
        opted = None
        is_correct = False
    
    physics_analysis.append({
        'QuestionNumber': qnum,
        'Selected': selected,
        'OptedText': opted,
        'CorrectAnswer': q['correct_answer'],
        'IsCorrect': is_correct,
        'Match': 'YES' if is_correct else 'NO'
    })

print(f"\nPhysics Summary:")
print(f"  Total: {len(physics_questions)}")
print(f"  Attempted: {physics_attempted_count}")
print(f"  Correct: {physics_correct_count}")
print(f"  Score: {(physics_correct_count * 5) - physics_attempted_count}")

# Step 7: Show detailed question-by-question comparison for Physics
print("\n[STEP 7] Detailed Physics Question Analysis...")
print("-" * 120)
print(f"{'Q#':<5} {'Selected':<10} {'OptedText':<40} {'CorrectAnswer':<40} {'Match':<8}")
print("-" * 120)

mismatches = []
for item in physics_analysis[:20]:  # Show first 20
    q_num = item['QuestionNumber']
    selected = item['Selected'] or 'None'
    opted_text = (item['OptedText'] or 'Not Attempted')[:37] + '...' if item['OptedText'] and len(item['OptedText']) > 40 else (item['OptedText'] or 'Not Attempted')
    correct_text = item['CorrectAnswer'][:37] + '...' if len(item['CorrectAnswer']) > 40 else item['CorrectAnswer']
    match = item['Match']
    
    print(f"{q_num:<5} {selected:<10} {opted_text:<40} {correct_text:<40} {match:<8}")
    
    if item['Selected'] and item['Selected'] in ['1','2','3','4'] and not item['IsCorrect']:
        # Check if text comparison might have issues
        if item['OptedText'] and item['CorrectAnswer']:
            if item['OptedText'].strip().lower() == item['CorrectAnswer'].strip().lower():
                mismatches.append({
                    'q': q_num,
                    'issue': 'Case/whitespace mismatch',
                    'opted': repr(item['OptedText']),
                    'correct': repr(item['CorrectAnswer'])
                })

print("-" * 120)

# Step 8: Check the saved Result in database
print("\n[STEP 8] Checking Saved Result in Database...")
try:
    result = Result.objects.get(student_id=STUDENT_ID, class_id=CLASS_ID, test_num=TEST_NUM)
    print(f"Found saved result:")
    print(f"  Physics - Total: {result.phy_total}, Attended: {result.phy_attended}, Correct: {result.phy_correct}, Score: {result.phy_score}")
    print(f"  Chemistry - Total: {result.chem_total}, Attended: {result.chem_attended}, Correct: {result.chem_correct}, Score: {result.chem_score}")
    print(f"  Botany - Total: {result.bot_total}, Attended: {result.bot_attended}, Correct: {result.bot_correct}, Score: {result.bot_score}")
    print(f"  Zoology - Total: {result.zoo_total}, Attended: {result.zoo_attended}, Correct: {result.zoo_correct}, Score: {result.zoo_score}")
    print(f"  Total Score: {result.total_score}")
    
    # Compare with our manual calculation
    print(f"\n  Comparison for Physics:")
    print(f"    DB says: {result.phy_correct} correct")
    print(f"    We calculated: {physics_correct_count} correct")
    if result.phy_correct != physics_correct_count:
        print(f"    ✗ MISMATCH! Difference: {result.phy_correct - physics_correct_count}")
    else:
        print(f"    ✓ Match!")
        
except Result.DoesNotExist:
    print(f"✗ No saved result found for this student/test")

# Step 9: Check for text comparison issues
print("\n[STEP 9] Checking for Text Normalization Issues...")
if mismatches:
    print(f"Found {len(mismatches)} potential text comparison issues:")
    for m in mismatches:
        print(f"  Q{m['q']}: {m['issue']}")
        print(f"    Opted:   {m['opted']}")
        print(f"    Correct: {m['correct']}")
else:
    print("No obvious text normalization issues found")

# Step 10: Check specific incorrect answers that might be marked correct
print("\n[STEP 10] Finding Questions Marked as CORRECT (Should be Incorrect)...")
print("-" * 120)
print(f"{'Q#':<5} {'Selected':<10} {'OptedText':<50} {'CorrectAnswer':<50}")
print("-" * 120)

false_positives = []
for item in physics_analysis:
    if item['IsCorrect'] and item['Selected']:
        # Double check - are they really the same?
        if item['OptedText'] and item['CorrectAnswer']:
            # Exact comparison
            if item['OptedText'] != item['CorrectAnswer']:
                print(f"{item['QuestionNumber']:<5} {item['Selected']:<10} {item['OptedText'][:47]:<50} {item['CorrectAnswer'][:47]:<50}")
                false_positives.append(item['QuestionNumber'])
                
                # Show byte comparison
                print(f"      Opted bytes: {item['OptedText'].encode('utf-8')[:50]}")
                print(f"      Correct bytes: {item['CorrectAnswer'].encode('utf-8')[:50]}")
                print(f"      Length: opted={len(item['OptedText'])}, correct={len(item['CorrectAnswer'])}")

print("-" * 120)
if false_positives:
    print(f"\n✗ FOUND {len(false_positives)} FALSE POSITIVES (marked correct but shouldn't be)!")
    print(f"   Question numbers: {false_positives}")
else:
    print("\n✓ No false positives found in our trace")

# Step 11: Summary and conclusion
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"Manual Analysis Result:")
print(f"  Physics Correct: {physics_correct_count}")
print(f"  Physics Score: {(physics_correct_count * 5) - physics_attempted_count}")
print(f"\nDatabase Result:")
try:
    print(f"  Physics Correct: {result.phy_correct}")
    print(f"  Physics Score: {result.phy_score}")
    print(f"\nDiscrepancy: {result.phy_correct - physics_correct_count} extra correct answers in DB")
except:
    print(f"  (No result found in DB)")

if false_positives:
    print(f"\n✗ ISSUE FOUND: {len(false_positives)} questions are being marked correct when they shouldn't be")
    print(f"   This would add {len(false_positives) * 5} extra marks")
else:
    print(f"\n✓ Analysis logic appears correct in this trace")
    print(f"   Issue may be in:")
    print(f"   - Data saved in QuestionAnalysis (check correct_answer field)")
    print(f"   - Previous analysis run with different data")
    print(f"   - Question number mapping across subjects")

print("\n" + "=" * 80)
