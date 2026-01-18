"""
Test script for chapter word cloud functionality.
Run from backend/ directory: python test_chapter_cloud.py
"""

import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inzighted.settings')
django.setup()

from exam.utils.chapter_cloud import get_chapter_word_cloud
from exam.models.result import StudentResult
from exam.models.student import Student
import json


def test_word_cloud():
    """Test the chapter word cloud generation."""
    print("=" * 80)
    print("Chapter Word Cloud Test")
    print("=" * 80)
    
    # Get a sample student
    sample_student = Student.objects.first()
    if not sample_student:
        print("❌ No students found in database")
        return
    
    student_id = sample_student.student_id
    class_id = sample_student.class_id
    
    print(f"\n📊 Testing for student: {sample_student.name} (ID: {student_id})")
    print(f"   Class: {class_id}")
    
    # Check if student has any responses
    responses = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    ).values('test_num').distinct()
    
    test_nums = [r['test_num'] for r in responses]
    
    if not test_nums:
        print(f"\n❌ No test responses found for student {student_id}")
        return
    
    print(f"\n✅ Found {len(test_nums)} test(s): {test_nums}")
    
    # Test with first available test
    test_num = test_nums[0]
    print(f"\n🔍 Generating word cloud for Test {test_num}...")
    
    word_cloud = get_chapter_word_cloud(student_id, class_id, test_num)
    
    if not word_cloud:
        print(f"\n⚠️  No word cloud data generated (student may have perfect scores or no NEET matches)")
        
        # Debug: show what chapters student attempted
        chapters = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).values('subject', 'chapter').distinct()
        
        print(f"\n📚 Chapters attempted by student:")
        for ch in chapters:
            print(f"   - {ch['subject']}: {ch['chapter']}")
        
        return
    
    print(f"\n✅ Generated {len(word_cloud)} word cloud entries:\n")
    print(json.dumps(word_cloud, indent=2))
    
    # Display summary
    print("\n" + "=" * 80)
    print("WORD CLOUD SUMMARY")
    print("=" * 80)
    for entry in word_cloud:
        print(f"\n📌 {entry['chapter']} ({entry['subject']})")
        print(f"   Accuracy: {entry['accuracy'] * 100:.1f}%")
        print(f"   NEET Weight: {entry['neet_weight'] * 100:.0f}%")
        print(f"   Font Size: {entry['fontSize']}px")
        print(f"   Questions: {entry['total_questions']}")
    
    print("\n" + "=" * 80)
    print("✅ Test completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    try:
        test_word_cloud()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
