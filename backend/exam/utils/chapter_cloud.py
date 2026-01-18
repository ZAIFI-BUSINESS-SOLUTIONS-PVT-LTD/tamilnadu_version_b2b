"""
Chapter-based word cloud generator for student report cards.

For each student and test, compute:
1. Weighted accuracy per chapter (grouped by subject)
2. Select lowest accuracy chapter per subject
3. Match with NEET chapter weights
4. Generate word cloud data with font sizes based on NEET weightage
"""

from collections import defaultdict
from exam.models.result import StudentResult
from exam.models.analysis import QuestionAnalysis
from exam.llm_call.NEET_data import chapter_weights
import logging

logger = logging.getLogger(__name__)


def normalize_chapter_name(chapter):
    """Normalize chapter names for matching (trim, lowercase)."""
    if not chapter:
        return ""
    return chapter.strip().lower()


def get_chapter_word_cloud(student_id, class_id, test_num):
    """
    Generate word cloud data based on lowest accuracy chapters per subject.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    
    Returns:
        List of dicts with:
        - chapter: Chapter name
        - subject: Subject name
        - accuracy: Student accuracy in this chapter (0-1)
        - neet_weight: NEET weightage (0-1, e.g., 0.07 for 7%)
        - fontSize: Computed font size (12-48px)
    """
    try:
        # Step 1: Get all student responses for this test
        student_responses = StudentResult.objects.filter(
            student_id=student_id,
            class_id=class_id,
            test_num=test_num
        ).values('subject', 'chapter', 'question_number', 'is_correct', 'was_attempted')
        
        if not student_responses:
            logger.warning(f"No responses found for student={student_id} test={test_num}")
            return []
        
        # Step 2: Group by subject and chapter, calculate weighted accuracy
        # Structure: {subject: {chapter: {"correct": N, "total": N, "accuracy": float}}}
        chapter_stats = defaultdict(lambda: defaultdict(lambda: {"correct": 0, "total": 0}))
        
        for resp in student_responses:
            subject = resp['subject']
            chapter = resp['chapter']
            
            # Skip if not attempted
            if not resp['was_attempted']:
                continue
            
            # Count question (weight = 1 for simplicity; can be extended to use marks from QuestionAnalysis)
            chapter_stats[subject][chapter]['total'] += 1
            if resp['is_correct']:
                chapter_stats[subject][chapter]['correct'] += 1
        
        # Calculate accuracy for each chapter
        for subject in chapter_stats:
            for chapter in chapter_stats[subject]:
                stats = chapter_stats[subject][chapter]
                if stats['total'] > 0:
                    stats['accuracy'] = stats['correct'] / stats['total']
                else:
                    stats['accuracy'] = 0.0
        
        # Step 3: For each subject, find the top 3 chapters with LOWEST accuracy
        lowest_chapters = []
        
        for subject, chapters in chapter_stats.items():
            if not chapters:
                continue
            
            # Sort chapters by accuracy (ascending) and take top 3 lowest
            sorted_chapters = sorted(chapters.items(), key=lambda x: x[1]['accuracy'])
            top_3_lowest = sorted_chapters[:3]  # Take top 3 lowest accuracy chapters
            
            for chapter_name, stats in top_3_lowest:
                lowest_chapters.append({
                    "subject": subject,
                    "chapter": chapter_name,
                    "accuracy": round(stats['accuracy'], 3),
                    "total_questions": stats['total']
                })
        
        # Step 4: Match with NEET chapter weights and prepare word cloud
        word_cloud_data = []
        
        # Build NEET weight lookup (normalize names)
        neet_lookup = {}
        for subject, topics in chapter_weights.items():
            for item in topics:
                topic_name = item['topic']
                weightage_str = item['weightage'].rstrip('%')
                weightage = float(weightage_str) / 100.0  # Convert "7%" to 0.07
                neet_lookup[normalize_chapter_name(topic_name)] = {
                    "topic": topic_name,
                    "weight": weightage,
                    "subject": subject
                }
        
        # Match and build cloud data
        matched_weights = []
        
        for entry in lowest_chapters:
            normalized_chapter = normalize_chapter_name(entry['chapter'])
            
            # Try exact match first
            neet_data = neet_lookup.get(normalized_chapter)
            
            # Try partial match if exact fails (chapter might be in NEET as topic or vice versa)
            if not neet_data:
                for neet_key, neet_val in neet_lookup.items():
                    if neet_key in normalized_chapter or normalized_chapter in neet_key:
                        neet_data = neet_val
                        break
            
            if neet_data:
                word_cloud_data.append({
                    "chapter": neet_data['topic'],  # Use NEET standardized name
                    "subject": entry['subject'],
                    "accuracy": entry['accuracy'],
                    "neet_weight": neet_data['weight'],
                    "total_questions": entry['total_questions']
                })
                matched_weights.append(neet_data['weight'])
            else:
                logger.debug(f"Chapter '{entry['chapter']}' not found in NEET weights")
        
        # Step 5: Compute font sizes based on NEET weightage
        # Font size range: 14px - 48px
        MIN_FONT = 14
        MAX_FONT = 48
        
        if matched_weights:
            min_weight = min(matched_weights)
            max_weight = max(matched_weights)
            weight_range = max_weight - min_weight
            
            for entry in word_cloud_data:
                if weight_range > 0:
                    normalized = (entry['neet_weight'] - min_weight) / weight_range
                else:
                    normalized = 0.5
                
                entry['fontSize'] = int(MIN_FONT + normalized * (MAX_FONT - MIN_FONT))
        else:
            # No matches found
            logger.info(f"No NEET weight matches found for student={student_id} test={test_num}")
        
        return word_cloud_data
    
    except Exception as e:
        logger.exception(f"Error generating chapter word cloud: {e}")
        return []
