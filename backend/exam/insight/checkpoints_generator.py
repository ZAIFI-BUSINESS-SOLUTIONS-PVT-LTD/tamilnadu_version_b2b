"""
Combined Checkpoints generation (Checklist + Action Plan in one LLM call).
Reuses existing data retrieval logic and combines prompts for paired insights.
"""
import json
import logging
import re
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.graph_utils.retrieve_action_plan_data import get_action_plan_data
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)


CHECKPOINTS_COMBINED_PROMPT = """
**Task**: Generate a comprehensive diagnostic and action plan for a NEET student by identifying both problems AND solutions for their weak topics.

**Context**: You are an AI mentor helping students understand both:
1. **WHAT went wrong** (diagnostic checklist of problems)
2. **HOW to fix it** (actionable steps to improve)

For each checkpoint, you will provide BOTH the problem identification AND the corresponding action plan.

**Input Data Provided**:
- Multiple weak topics with performance metrics (accuracy, weighted accuracy, improvement rate)
- Wrong questions from each topic including:
  - Question text, options, selected answer, correct answer
  - Misconception type and description
  - Feedback for the incorrect answer
  - Question type

**Your Task**:
1. Analyze ALL weak topics and wrong answers provided FOR THIS SUBJECT
2. Identify the most critical problems across topics IN THIS SUBJECT
3. For EACH problem, also determine the most impactful action to fix it
4. Generate a **specific subtopic name** that precisely describes the narrow area of difficulty within the topic
5. Rank checkpoints by:
   - **Severity/Impact**: How much this issue affects overall performance
   - **Actionability**: How clear and achievable the solution is
6. Select ONLY the **top 2 most critical problem-solution pairs** for THIS SUBJECT

**Checkpoint Requirements**:
- Each checklist item must be **10–15 words** maximum
- Each action plan item must be **10–15 words** maximum
- **Subtopic** must be a specific, narrow area within the topic.
- Checklist must identify WHAT went wrong (diagnostic, factual)
- Action plan must describe HOW to fix it (prescriptive, actionable)
- Use simple, easy-to-understand Indian-English
- Each item should be at the reading level of a 10-year-old Indian student. Use only very simple English words. Do NOT use difficult or formal words.
- Be specific and directly tied to their actual mistakes
- Reference the specific topic/subject in context

**Output Format (strict JSON)**:
[
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "subtopic": "Specific narrow area within topic",
    "accuracy": 0.45,
    "checklist": "Specific problem or mistake identified (10–15 words)",
    "action_plan": "Specific action to fix this problem (10–15 words)",
    "citation": [5, 12, 18]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "subtopic": "Specific narrow area within topic",
    "accuracy": 0.32,
    "checklist": "Specific problem or mistake identified (10–15 words)",
    "action_plan": "Specific action to fix this problem (10–15 words)",
    "citation": [7, 22]
  }
]

**Citation Requirements**:
- Each checkpoint MUST include a "citation" field listing the question numbers that support this insight
- Citation format: array of question numbers, e.g., [5, 12, 18]
- Include 2-5 question numbers per checkpoint as evidence
- Select questions that best demonstrate the specific problem identified in the checklist
- Questions in citation should be from the wrong_questions data provided for that topic

**Guidelines**:
- Return EXACTLY 2 checkpoint pairs for THIS SUBJECT (not more, not less)
- These 2 should be the highest-impact issues for THIS SUBJECT
- Each checklist-action pair must be logically connected (the action fixes the checklist problem)
- Checklist uses diagnostic language: "confused", "mistook", "missed", "incorrectly applied"
- Action plan uses prescriptive language: "practice", "review", "memorize", "understand"
- Both should directly reflect the student's actual wrong answers
- Keep tone supportive and constructive
- Both checkpoints can be from the same topic if they're high-impact

**Important**:
- Return ONLY the JSON array of exactly 2 items for THIS SUBJECT
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above
- Ensure checklist and action_plan are paired and related for each item

"""


def clean_checkpoints_response(response):
    """Clean and parse checkpoints response from Gemini"""
    if not response:
        return []
    
    try:
        # Remove markdown code blocks if present
        cleaned = response.strip()
        match = re.search(r'```(?:json)?\s*(\[\s*.*?\s*\])\s*```', cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1)
        
        # Parse JSON
        checkpoints = json.loads(cleaned)
        
        if not isinstance(checkpoints, list):
            logger.error("Checkpoints response is not a list")
            return []
        
        # Validate structure
        validated = []
        for item in checkpoints:
            if not isinstance(item, dict):
                continue
            
            # Check required fields
            if not all(k in item for k in ['topic', 'subject', 'subtopic', 'accuracy', 'checklist', 'action_plan']):
                logger.warning(f"Checkpoint item missing required fields: {item}")
                continue
            
            # Validate word count (relaxed: 8-18 words acceptable)
            checklist_words = len(item['checklist'].split())
            action_words = len(item['action_plan'].split())
            
            if checklist_words < 5 or checklist_words > 20:
                logger.warning(f"Checklist word count out of range: {checklist_words} words")
            if action_words < 5 or action_words > 20:
                logger.warning(f"Action plan word count out of range: {action_words} words")
            
            # Validate citation if present (optional for backward compatibility)
            if 'citation' in item:
                citation = item['citation']
                if not isinstance(citation, list):
                    logger.warning(f"Citation should be a list of question numbers: {citation}")
                    # Try to convert if it's a string or other format
                    if isinstance(citation, str):
                        # Parse string like "Q5, Q12" or "5, 12"
                        try:
                            citation = [int(q.strip().replace('Q', '').replace('q', '')) for q in citation.split(',')]
                            item['citation'] = citation
                        except:
                            item['citation'] = []
                    else:
                        item['citation'] = []
            else:
                # Add empty citation for consistency
                item['citation'] = []
            
            validated.append(item)
        
        return validated
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse checkpoints JSON: {e}")
        logger.error(f"Response: {response[:500]}")
        return []
    except Exception as e:
        logger.error(f"Error cleaning checkpoints response: {e}", exc_info=True)
        return []


@traceable()
def generate_checkpoints_testwise(student_id, class_id, test_num):
    """
    Generate combined checkpoints (checklist + action plan) for a student's test.
    
    Reuses the same data retrieval logic as actionplan/checklist but combines
    both insights into a single LLM call for better alignment.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
    
    Returns:
        list: List of checkpoint dicts with 'topic', 'subject', 'subtopic', 'accuracy', 
              'checklist', and 'action_plan' fields. Returns exactly 5 items
              or empty list if generation fails.
    """
    try:
        logger.info(f"🔍 Generating checkpoints for student={student_id}, class={class_id}, test={test_num}")
        
        # Get weak topics data from Postgres (same as actionplan/checklist)
        data = get_action_plan_data(student_id, class_id, test_num)
        
        if not data or 'topics' not in data or not data['topics']:
            logger.info(f"No weak topics found for student {student_id} - performing well")
            return []
        
        # Group topics by subject
        from collections import defaultdict
        subjects_data = defaultdict(list)
        for topic_data in data['topics']:
            topic_info = {
                'topic': topic_data['topic'],
                'subject': topic_data['subject'],
                'accuracy': topic_data['accuracy'],
                'weighted_accuracy': topic_data['weighted_accuracy'],
                'improvement_rate': topic_data['improvement_rate'],
                'total_questions': topic_data['total_questions'],
                'wrong_questions': topic_data['wrong_questions'][:5]  # Limit to 5 per topic
            }
            subjects_data[topic_data['subject']].append(topic_info)
        
        logger.info(f"📚 Found {len(subjects_data)} subjects to process: {list(subjects_data.keys())}")
        
        # Generate checkpoints for each subject (2 per subject)
        all_checkpoints = []
        for subject, topics_for_subject in subjects_data.items():
            logger.info(f"🔍 Processing subject: {subject} with {len(topics_for_subject)} topics")
            
            # Build subject-specific prompt
            full_prompt = CHECKPOINTS_COMBINED_PROMPT + f"\n\n**Subject**: {subject}\n\n**Weak Topics Data for {subject}**:\n" + json.dumps(topics_for_subject, indent=2)
            
            # Call Gemini with retry (structured) for this subject
            subject_checkpoints = None
            for attempt in range(3):
                try:
                    result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)
                    
                    if isinstance(result, dict):
                        if result.get("ok"):
                            response = result.get("response", "") or ""
                        else:
                            logger.warning(f"Gemini structured error (checkpoints for {subject}): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                            response = ""
                    else:
                        response = result or ""
                    
                    # Clean and parse response
                    subject_checkpoints = clean_checkpoints_response(response)
                    
                    if subject_checkpoints and isinstance(subject_checkpoints, list) and len(subject_checkpoints) > 0:
                        logger.info(f"✅ Generated {len(subject_checkpoints)} checkpoints for subject {subject}")
                        break
                    
                    logger.warning(f"⚠️ Checkpoints response invalid for {subject} (attempt {attempt + 1}), retrying...")
                
                except Exception as e:
                    logger.warning(f"⚠️ Checkpoints generation for {subject} attempt {attempt + 1} failed: {e}")
                    if attempt == 2:
                        logger.error(f"❌ Failed to generate checkpoints for {subject} after 3 attempts")
            
            # Add valid checkpoints to result (limit to 2 per subject)
            if subject_checkpoints:
                all_checkpoints.extend(subject_checkpoints[:2])
        
        logger.info(f"✅ Generated total {len(all_checkpoints)} checkpoints across all subjects for student {student_id}")
        return all_checkpoints
    
    except Exception as e:
        logger.error(f"❌ Error in generate_checkpoints_testwise: {e}", exc_info=True)
        return []
