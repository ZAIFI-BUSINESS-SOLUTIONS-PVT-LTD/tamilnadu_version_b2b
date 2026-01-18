"""
Subtopic Recommender Generator - LLM-based subtopic ranking for student reports.

This module generates top 6 subtopics per subject based on student's mistake patterns,
following NCERT NEET syllabus, with citations (test_num, question_num) as proof.
"""
import json
import logging
import re
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)


subtopic_recommendation_prompt = """
**Task**: Rank the top 6 subtopics to be studied by the student IN EACH SUBJECT based on their mistake patterns.

**Context**: You are an educational analyst creating a personalized study priority list for a NEET student. The student has taken multiple tests, and you need to identify which NCERT NEET syllabus subtopics they should focus on to improve their performance.

**Input Data Provided**:
- Multiple weak topics GROUPED BY SUBJECT with performance metrics (accuracy, weighted accuracy, improvement rate)
- Wrong questions from each topic including:
  - Question text, options, selected answer, correct answer
  - Misconception type and description
  - Feedback for the incorrect answer
  - Test number and question number

**Your Task**:
1. Analyze ALL weak topics and wrong answers provided FOR EACH SUBJECT SEPARATELY
2. Identify specific NCERT NEET subtopics for each questions, where the student made mistakes
3. Analysis teh pattern between the subtopics found in the wrong questions.
4. Rank subtopics within each subject by:
   - **Frequency**: How many mistakes in this subtopic
   - **Severity**: How fundamental/important is this subtopic for NEET
   - **Pattern**: Consistent mistakes vs one-time errors
   - **Foundation**: Does this subtopic affect understanding of other topics
5. Select the **top 6 subtopics PER SUBJECT** that need immediate attention
6. For each subtopic, provide citations that supports the recommendation (test_num and question_num) as proof,not random numbers.

**Subtopic Requirements** (STRICT):
- **MUST BE FROM NCERT NEET SYLLABUS ONLY** - use exact chapter and section names from NCERT textbooks
- **WORD LIMIT: 1-5 words maximum** (e.g., "Photoelectric Effect", "Laws of Motion", "Chemical Bonding")
- Be specific and concise: e.g., "Photoelectric Effect" not "Modern Physics" or "Quantum Mechanics"
- Must be directly related to the mistakes shown in the data
- Each subtopic should be actionable (student can study/practice it)
- Subtopics should be ordered by priority (rank 1 = highest priority)
- Examples of correct NCERT NEET subtopic names:
  * Physics: "Newton's Laws", "Projectile Motion", "Work Energy Theorem", "Electromagnetic Induction"
  * Chemistry: "Periodic Trends", "Redox Reactions", "Organic Reactions", "Equilibrium Constants"
  * Biology: "Cell Division", "Photosynthesis", "Genetic Inheritance", "Natural Selection"

**Citation Requirements** (NO LIMIT):
- Each subtopic MUST include ALL citations showing which questions support this recommendation
- **INCLUDE EVERY WRONG QUESTION RELATED TO THIS SUBTOPIC - NO UPPER LIMIT**
- Citation format: array of objects with test_num and question_num
- Example: [{"test_num": 10, "question_num": 5}, {"test_num": 10, "question_num": 12}, {"test_num": 3, "question_num": 8}]
- Include as many citations as needed to cover all related mistakes in the data

**Output Format (strict JSON)**:
{
  "Physics": [
    {
      "subtopic": "Newton's Laws",
      "rank": 1,
      "reason": "Fundamental gap, impacts all mechanics (max 20 words)",
      "citations": [
        {"test_num": 1, "question_num": 5},
        {"test_num": 2, "question_num": 10},
        {"test_num": 3, "question_num": 8},
        {"test_num": 5, "question_num": 12},
        {"test_num": 7, "question_num": 3}
      ]
    },
    {
      "subtopic": "Projectile Motion",
      "rank": 2,
      "reason": "Recurring errors in vector analysis (max 20 words)",
      "citations": [
        {"test_num": 1, "question_num": 15},
        {"test_num": 2, "question_num": 22},
        {"test_num": 4, "question_num": 18}
      ]
    }
  ],
  "Chemistry": [
    {
      "subtopic": "Periodic Trends",
      "rank": 1,
      "reason": "Critical for understanding element properties (max 20 words)",
      "citations": [
        {"test_num": 2, "question_num": 50},
        {"test_num": 3, "question_num": 55},
        {"test_num": 5, "question_num": 48},
        {"test_num": 6, "question_num": 52}
      ]
    }
  ]
}

**Guidelines**:
- Return EXACTLY 6 subtopics PER SUBJECT (if data available)
- If fewer than 6 mistakes in a subject, return as many as have evidence
- Subtopics must be ranked 1-6 (1 = highest priority)
- **CRITICAL - Subtopic Naming**:
  * MUST be exact NCERT NEET chapter/section names, NOT generic topics
  * MUST be 1-5 words MAXIMUM
  * Examples: "Laws of Motion", "Periodic Table", "Cell Division", "Photosynthesis Light Reactions"
  * NOT allowed: "Mechanics Basics" (generic), "Advanced Physics" (too vague), "Life Processes Respiration Photosynthesis" (too long)
- **CRITICAL - Citations**:
  * Include ALL related wrong questions, NO UPPER LIMIT
  * DO NOT limit to 1-5 citations
  * If a subtopic has 10 related mistakes, include all 10
  * Each citation must be from provided wrong_questions data
- Follow NCERT NEET syllabus terminology strictly
- Group output by subject using EXACT subject names from input data
- Subject names must match input exactly (no renaming, merging, or splitting)
- Reason should explain the mistake pattern, not be generic advice

**Important**:
- Return ONLY the JSON object with subject keys
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above
- Each subtopic MUST have "subtopic", "rank", "reason", and "citations" fields
- Citations must reference actual questions from the input data
"""


@traceable()
def generate_subtopic_recommendations(student_id, class_id, test_num, cumulative_data):
    """
    Generate top 6 subtopics per subject for the student to study, based on cumulative mistake patterns.
    Uses cumulative checkpoint data format (all tests).
    
    Args:
        student_id: Student identifier
        class_id: Class identifier  
        test_num: Test number (for context)
        cumulative_data: Dict with 'topics' list containing cumulative data:
            {
                "topics": [
                    {
                        "topic_metadata": {
                            "subject": "...",
                            "topic": "...",
                            "total_questions_attempted": 72,
                            "accuracy": 64,
                            "weighted_accuracy": 60,
                            "improvement_rate": "+12%"
                        },
                        "wrong_questions_by_test": [...]
                    }
                ]
            }
    
    Returns:
        dict: {subject: [{subtopic, rank, reason, citations: [{test_num, question_num}]}]}
    """
    try:
        if not cumulative_data or 'topics' not in cumulative_data or not cumulative_data['topics']:
            logger.info(f"No cumulative topics data for student {student_id} - no subtopic recommendations needed")
            return {}
        
        # Group topics by subject
        from collections import defaultdict
        topics_by_subject = defaultdict(list)
        
        for topic_data in cumulative_data['topics']:
            metadata = topic_data.get('topic_metadata', {})
            subject = metadata.get('subject', 'Unknown')
            
            # Flatten wrong questions across all tests with test_num
            all_wrong_questions = []
            for test_data in topic_data.get('wrong_questions_by_test', []):
                test_id = test_data.get('test_id', 'Test_0')
                # Extract test_num from "Test_X" format
                test_num_extracted = int(test_id.split('_')[1]) if '_' in test_id else 0
                
                for wrong_q in test_data.get('wrong_questions', []):
                    all_wrong_questions.append({
                        'test_num': test_num_extracted,
                        'question_number': wrong_q.get('question_number'),
                        'misconception_type': wrong_q.get('misconception_type'),
                        'misconception_text': wrong_q.get('misconception_text')
                    })
            
            topic_info = {
                'topic': metadata.get('topic'),
                'subject': subject,
                'accuracy': metadata.get('accuracy', 0),
                'weighted_accuracy': metadata.get('weighted_accuracy', 0),
                'improvement_rate': metadata.get('improvement_rate', '+0%'),
                'total_questions_attempted': metadata.get('total_questions_attempted', 0),
                'wrong_questions': all_wrong_questions
            }
            topics_by_subject[subject].append(topic_info)
        
        # Build LLM prompt
        subject_count = len(topics_by_subject)
        subject_names = ", ".join(sorted(topics_by_subject.keys()))
        
        # Convert to list for JSON serialization
        topics_for_llm = []
        for subject in sorted(topics_by_subject.keys()):
            topics_for_llm.extend(topics_by_subject[subject])
        
        full_prompt = subtopic_recommendation_prompt + f"""

**CRITICAL INSTRUCTIONS FOR THIS STUDENT**:
- **Subjects in Input Data**: {subject_names} ({subject_count} subjects)
- **YOU MUST USE THESE EXACT SUBJECT NAMES**: {subject_names}
- Do NOT rename, merge, or split subjects
- Output JSON keys MUST be: {', '.join([f'"{s}"' for s in sorted(topics_by_subject.keys())])}
- Data Type: Cumulative (all tests)
- Expected Output: Up to 6 subtopics per subject

**Cumulative Topics Data (Grouped by Subject)**:
""" + json.dumps(topics_for_llm, indent=2)
        
        # Call Gemini with retry
        for attempt in range(3):
            try:
                result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error (subtopics): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                # Clean and parse response
                subtopics = clean_subtopic_response(response)
                
                # Validate subjects match input data
                subtopics = validate_subjects(subtopics, topics_by_subject)

                if subtopics and isinstance(subtopics, dict) and len(subtopics) > 0:
                    logger.info(f"✅ Generated subtopic recommendations for {len(subtopics)} subjects for student {student_id}")
                    return subtopics

                logger.warning(f"⚠️ Subtopic response invalid (attempt {attempt + 1}), retrying...")

            except Exception as e:
                logger.warning(f"⚠️ Subtopic generation attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
        
        # Fallback: return empty
        logger.error(f"❌ Failed to generate subtopic recommendations after 3 attempts for student {student_id}")
        return {}
        
    except Exception as e:
        logger.error(f"❌ Error in generate_subtopic_recommendations: {e}", exc_info=True)
        return {}


def clean_subtopic_response(response):
    """Clean and parse subtopic response from Gemini"""
    if not response:
        return {}
    
    # Try to extract JSON from markdown code blocks
    if isinstance(response, str):
        # Remove markdown code blocks
        response = response.strip()
        
        # Check for markdown JSON block
        match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                return validate_subtopic_structure(parsed)
            except:
                pass
        
        # Try direct JSON parse
        try:
            parsed = json.loads(response)
            return validate_subtopic_structure(parsed)
        except:
            pass
        
        # Try to find JSON object in the text
        match = re.search(r'\{\s*"[^"]+"\s*:\s*\[.*?\]\s*\}', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                return validate_subtopic_structure(parsed)
            except:
                pass
    
    elif isinstance(response, dict):
        return validate_subtopic_structure(response)
    
    return {}


def validate_subjects(subtopics, expected_subjects_dict):
    """
    Validate that output subjects match input subjects exactly.
    Filters out any subjects not in the input data.
    
    Args:
        subtopics: Dict from LLM with subject keys
        expected_subjects_dict: Dict with expected subject keys from input
    
    Returns:
        dict: Filtered subtopics with only valid subjects
    """
    if not isinstance(subtopics, dict):
        return {}
    
    expected_subjects = set(expected_subjects_dict.keys())
    validated = {}
    
    for subject, recommendations in subtopics.items():
        if subject in expected_subjects:
            validated[subject] = recommendations
        else:
            logger.warning(f"⚠️ LLM returned unexpected subject '{subject}' - filtering out (expected: {expected_subjects})")
    
    return validated


def validate_subtopic_structure(data):
    """Validate and clean subtopic recommendation structure"""
    if not isinstance(data, dict):
        return {}
    
    validated = {}
    
    for subject, subtopics in data.items():
        if not isinstance(subtopics, list):
            continue
        
        valid_subtopics = []
        for item in subtopics:
            if not isinstance(item, dict):
                continue
            
            # Check required fields
            if 'subtopic' not in item or 'rank' not in item or 'citations' not in item:
                continue
            
            # Validate citations format
            citations = item.get('citations', [])
            if not isinstance(citations, list):
                continue
            
            valid_citations = []
            for citation in citations:
                if isinstance(citation, dict) and 'test_num' in citation and 'question_num' in citation:
                    valid_citations.append({
                        'test_num': citation['test_num'],
                        'question_num': citation['question_num']
                    })
            
            if not valid_citations:
                continue
            
            valid_subtopics.append({
                'subtopic': item['subtopic'],
                'rank': item['rank'],
                'reason': item.get('reason', ''),
                'citations': valid_citations
            })
        
        if valid_subtopics:
            validated[subject] = valid_subtopics
    
    return validated
