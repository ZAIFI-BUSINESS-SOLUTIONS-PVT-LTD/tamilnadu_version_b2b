"""
Combined Checkpoint Generator - Generates paired checklist + action plan in a single LLM call.

This module combines the functionality of checklist and action plan generation
to ensure 1:1 alignment between problem identification and remedial actions.
"""
import json
import logging
import re
from exam.llm_call.gemini_api import call_gemini_api_with_rotation
from exam.llm_call.decorators import traceable

logger = logging.getLogger(__name__)


# Combined Checkpoint Prompt
checkpoint_prompt = """
**Task**: Generate 5 paired diagnostic checkpoints for a NEET student's test performance.

**Context**: You are an educational analyst creating paired insights where:
- **Checkpoint** identifies WHAT went wrong (the problem/mistake) — diagnostic and factual
- **Action** explains HOW to fix it (the solution/improvement step) — prescriptive and actionable

Each pair must be directly related—checkpoint #1's problem is addressed by action #1.

**Input Data Provided**:
- Multiple weak topics from a specific test with performance metrics (accuracy, weighted accuracy, improvement rate)
- Wrong questions from each topic including:
  - Question text, options, selected answer, correct answer
  - Misconception type and description
  - Feedback for the incorrect answer
  - Question type

**Your Task**:
1. Analyze ALL weak topics and wrong answers provided
2. Identify specific problems, mistakes, and misconceptions across all topics:
   - What conceptual errors were made
   - What calculation/procedural mistakes occurred
   - What patterns of confusion are evident
   - What fundamental gaps exist
   - Root causes of mistakes
   - Error patterns across questions
3. Rank problems by:
   - **Severity/Impact**: How much this mistake affects overall performance
   - **Frequency**: How often this mistake appears across questions
   - **Actionability**: How clear and achievable the solution is
4. Select the **top 5 most critical problem-solution pairs** from across all topics
5. For each problem, generate a paired checkpoint:
   - **Checkpoint**: What went wrong (diagnostic, factual, not prescriptive)
   - **Action**: How to fix it (prescriptive, actionable, specific to the mistake)

**Checkpoint Requirements**:
- Each checkpoint text: **10–15 words** maximum
- Must clearly identify WHAT went wrong (not how to fix it)
- Must be diagnostic and factual, not prescriptive
- Use simple, easy-to-understand Indian-English
- Language level: readable by a 10-year-old Indian student
- Use only very simple English words. Do NOT use difficult or formal words
- Avoid solution-oriented language (no "should do", "need to practice")
- Be direct and clear about the mistake or gap
- Use diagnostic language: "confused", "mistook", "missed", "incorrectly applied"
- Must reference the specific topic/subject where the problem occurred
- Directly reflect the student's actual wrong answers

**Action Requirements**:
- Each action text: **10–15 words** maximum
- Must be specific, clear, and directly tied to the checkpoint's mistake
- Must be actionable and student-friendly
- Focus on learning improvements, not just "practice more"
- Use action language: "practice", "revise", "focus on", "review", "understand"
- Be motivational yet honest about areas needing work
- Keep tone supportive and constructive
- Must reference the specific topic/subject it relates to
- No generic advice—make it specific to the actual mistakes in the data

**Output Format (strict JSON)**:
[
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.45,
    "checkpoint": "Specific mistake or misconception (10–15 words)",
    "action": "How to fix this mistake (10–15 words)",
    "citation": [5, 12, 18]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.32,
    "checkpoint": "Specific mistake or misconception (10–15 words)",
    "action": "How to fix this mistake (10–15 words)",
    "citation": [7, 22]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.58,
    "checkpoint": "Specific mistake or misconception (10–15 words)",
    "action": "How to fix this mistake (10–15 words)",
    "citation": [3, 9, 14]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.41,
    "checkpoint": "Specific mistake or misconception (10–15 words)",
    "action": "How to fix this mistake (10–15 words)",
    "citation": [11, 20]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.29,
    "checkpoint": "Specific mistake or misconception (10–15 words)",
    "action": "How to fix this mistake (10–15 words)",
    "citation": [2, 15, 19]
  }
]

**Citation Requirements**:
- Each checkpoint MUST include a "citation" field listing the question numbers that support this insight
- Citation format: array of question numbers, e.g., [5, 12, 18]
- Include 1-3 question numbers per checkpoint as evidence
- Questions in citation should be from the wrong_questions data provided for that topic

**Guidelines**:
- Return EXACTLY 5 paired checkpoints total (not per topic)
- These 5 should be the highest-impact issues across ALL topics
- Each checkpoint-action pair must be logically connected
- Checkpoints should reflect actual wrong answers in the data
- Actions should directly address the checkpoint's problem
- Multiple pairs can be from the same topic if they're high-impact
- Keep tone supportive and constructive

**Important**:
- Return ONLY the JSON array of exactly 5 items
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above
- Each item MUST have "checkpoint", "action", and "citation" fields

"""


@traceable()
def generate_checkpoints_testwise(student_id, class_id, test_num, weak_topics_data):
    """
    Generate combined checkpoints (checklist + action plan) in a single LLM call.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        test_num: Test number
        weak_topics_data: Dict containing 'topics' list with weak topic information
    
    Returns:
        list: List of 5 checkpoint dictionaries with checkpoint and action fields
    """
    try:
        if not weak_topics_data or 'topics' not in weak_topics_data or not weak_topics_data['topics']:
            logger.info(f"No weak topics found for student {student_id} - performing well")
            return []
        
        # Prepare data for LLM (same format as actionplan/checklist)
        topics_for_llm = []
        for topic_data in weak_topics_data['topics']:
            topic_info = {
                'topic': topic_data['topic'],
                'subject': topic_data['subject'],
                'accuracy': topic_data['accuracy'],
                'weighted_accuracy': topic_data['weighted_accuracy'],
                'improvement_rate': topic_data['improvement_rate'],
                'total_questions': topic_data['total_questions'],
                'wrong_questions': topic_data['wrong_questions']
            }
            topics_for_llm.append(topic_info)
        
        # Build LLM prompt
        full_prompt = checkpoint_prompt + "\n\n**Weak Topics Data**:\n" + json.dumps(topics_for_llm, indent=2)
        
        # Call Gemini with retry (structured)
        for attempt in range(3):
            try:
                result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error (checkpoints): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                # Clean and parse response
                checkpoints = clean_checkpoint_response(response)

                if checkpoints and isinstance(checkpoints, list) and len(checkpoints) > 0:
                    logger.info(f"✅ Generated {len(checkpoints)} combined checkpoints for student {student_id}")
                    return checkpoints

                logger.warning(f"⚠️ Checkpoint response invalid (attempt {attempt + 1}), retrying...")

            except Exception as e:
                logger.warning(f"⚠️ Checkpoint generation attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
        
        # Fallback: return empty
        logger.error(f"❌ Failed to generate checkpoints after 3 attempts for student {student_id}")
        return []
        
    except Exception as e:
        logger.error(f"❌ Error in generate_checkpoints_testwise: {e}", exc_info=True)
        return []


def clean_checkpoint_response(response):
    """Clean and parse checkpoint response from Gemini"""
    if not response:
        return []
    
    # Try to extract JSON from markdown code blocks
    if isinstance(response, str):
        # Remove markdown code blocks
        response = response.strip()
        
        # Check for markdown JSON block
        match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(1))
                return validate_checkpoint_structure(parsed)
            except:
                pass
        
        # Try direct JSON parse
        try:
            parsed = json.loads(response)
            return validate_checkpoint_structure(parsed)
        except:
            pass
        
        # Try to find JSON array in the text
        match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                return validate_checkpoint_structure(parsed)
            except:
                pass
    
    elif isinstance(response, list):
        return validate_checkpoint_structure(response)
    
    return []


def validate_checkpoint_structure(data):
    """Validate and normalize checkpoint data structure"""
    if not isinstance(data, list):
        return []
    
    validated = []
    for item in data:
        if not isinstance(item, dict):
            continue
        
        # Ensure required fields exist
        if 'topic' not in item or 'subject' not in item:
            continue
        
        # Must have both checkpoint and action fields
        checkpoint = item.get('checkpoint')
        action = item.get('action')
        
        if not checkpoint or not isinstance(checkpoint, str):
            continue
        if not action or not isinstance(action, str):
            continue
        
        validated_item = {
            'topic': item['topic'],
            'subject': item['subject'],
            'accuracy': item.get('accuracy', 0.0),
            'checkpoint': checkpoint.strip(),
            'action': action.strip()
        }
        
        # Validate citation if present (optional for backward compatibility)
        if 'citation' in item:
            citation = item['citation']
            # Can be list of ints (test-wise) or list of dicts (cumulative)
            if isinstance(citation, list):
                validated_item['citation'] = citation
            elif isinstance(citation, str):
                # Try to parse string format
                try:
                    citation = [int(q.strip().replace('Q', '').replace('q', '')) for q in citation.split(',')]
                    validated_item['citation'] = citation
                except:
                    validated_item['citation'] = []
            else:
                validated_item['citation'] = []
        else:
            # Add empty citation for consistency
            validated_item['citation'] = []
        
        validated.append(validated_item)
    
    # Ensure exactly 5 items
    return validated[:5]


# ========================================
# Cumulative Checkpoint Generation (All Tests)
# ========================================

cumulative_checkpoint_prompt = """
**Task**: Generate 5 paired diagnostic checkpoints analyzing a NEET student's long-term learning patterns across ALL tests taken.

**Context**: You are an expert educational analyst specializing in long-term learning behavior across multiple exams. You will receive:
- Topic-level performance metrics aggregated across all tests
- Wrong questions grouped by test (in chronological order)
- For each wrong question: misconception type and detailed misconception description

**Your Goal**: Analyze the student's learning trajectory over time to:
1. Identify recurring or semantically similar misconceptions across different tests
2. Track how misunderstandings evolve (e.g., conceptual → application errors)
3. Detect subtopics where foundational understanding was never fully corrected
4. Reveal hidden weaknesses not obvious from accuracy or improvement rate alone
5. Explain root conceptual gaps blocking long-term mastery

**Key Insight**: You must find misconception PATTERNS that humans cannot easily identify by:
- Recognizing the same conceptual error appearing in different question contexts
- Identifying error chains (one misconception causing subsequent mistakes)
- Detecting persistent blind spots despite improvement in other areas
- Finding subtle connections between seemingly unrelated mistakes

**Input Data Structure**:
For each weak topic you will receive:
```json
{
  "topic_metadata": {
    "subject": "Physics",
    "chapter": "Laws of Motion",
    "topic": "Newton's Laws",
    "total_questions_attempted": 72,
    "accuracy": 64,
    "weighted_accuracy": 60,
    "improvement_rate": "+12%"
  },
  "wrong_questions_by_test": [
    {
      "test_id": "Test_1",
      "wrong_questions": [
        {
          "question_number": 5,
          "misconception_type": "conceptual",
          "misconception_text": "Assumed action and reaction forces act on the same object"
        }
      ]
    },
    {
      "test_id": "Test_8",
      "wrong_questions": [...]
    }
  ]
}
```

**Analysis Requirements**:
1. **Pattern Detection**: Look for repeated misconceptions across tests (same or similar errors)
2. **Evolution Tracking**: Identify if errors are getting worse, staying constant, or changing form
3. **Root Cause Analysis**: Determine underlying conceptual gaps causing multiple surface-level mistakes
4. **Subtopic Precision**: Be specific about which aspect of the topic is problematic
5. **Actionability**: Ensure insights lead to clear remedial actions

**Checkpoint Requirements**:
- Each checkpoint text: **20–25 words** maximum
- Must identify a PATTERN or RECURRING issue (not single-test mistakes)
- Must be diagnostic and evidence-based from the misconception data
- **MUST cite specific evidence**: Include test numbers and question numbers where this pattern appeared
  - Format: "...in Test 3 (Q12), Test 7 (Q5)..." or "...across Tests 3, 7, 12 (multiple questions)..."
- Must be SPECIFIC about the exact mistake/misconception, not vague generalizations
- Use simple, easy-to-understand Indian-English
- Language level: readable by a 10-year-old Indian student
- Use diagnostic language: "repeatedly confused", "consistently mistook", "persistent gap in"
- Reference the specific topic/subtopic and the pattern observed
- Avoid solution-oriented language in the checkpoint itself
- Examples of good specificity:
  - GOOD: "Repeatedly confused gametophyte and sporophyte phases in Bryophyte life cycle (Test 3 Q12, Test 8 Q15)"
  - BAD: "Consistently misses Bryophyte life cycle details"
- Each checkpoint must clearly explain WHAT mistake was made with concrete examples

**Action Requirements**:
- Each action text: **20–25 words** maximum
- Must be specific to fixing the PATTERN (not just individual mistakes)
- Focus on addressing root causes and long-term mastery
- Use action language: "practice identifying", "master the difference between", "build foundation in"
- Be concrete and student-actionable with specific learning activities
- Must directly address the checkpoint's identified pattern
- Should reference the specific subtopic/concept that needs work
- Examples of good actions:
  - GOOD: "Draw and label gametophyte vs. sporophyte stages side-by-side; practice with 10 life cycle diagrams"
  - BAD: "Practice drawing and labelling the full Bryophyte life cycle diagrams"

**Output Format (strict JSON)**:
[
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 64,
    "checkpoint": "Specific recurring pattern with evidence: Test X (QY), Test Z (QW)... (20–25 words)",
    "action": "Concrete remedial action addressing the specific pattern (20–25 words)",
    "citation": [{"test": 3, "questions": [12, 15]}, {"test": 7, "questions": [5, 22]}]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 52,
    "checkpoint": "Specific recurring pattern with evidence: Test X (QY), Test Z (QW)... (20–25 words)",
    "action": "Concrete remedial action addressing the specific pattern (20–25 words)",
    "citation": [{"test": 1, "questions": [8]}, {"test": 4, "questions": [11, 19]}, {"test": 8, "questions": [3]}]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 48,
    "checkpoint": "Specific recurring pattern with evidence: Test X (QY), Test Z (QW)... (20–25 words)",
    "action": "Concrete remedial action addressing the specific pattern (20–25 words)",
    "citation": [{"test": 2, "questions": [6, 14]}, {"test": 5, "questions": [9]}]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 71,
    "checkpoint": "Specific recurring pattern with evidence: Test X (QY), Test Z (QW)... (20–25 words)",
    "action": "Concrete remedial action addressing the specific pattern (20–25 words)",
    "citation": [{"test": 3, "questions": [7, 18]}, {"test": 6, "questions": [2, 13]}]
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 39,
    "checkpoint": "Specific recurring pattern with evidence: Test X (QY), Test Z (QW)... (20–25 words)",
    "action": "Concrete remedial action addressing the specific pattern (20–25 words)",
    "citation": [{"test": 1, "questions": [4, 10]}, {"test": 7, "questions": [15, 20]}]
  }
]

**Citation Requirements**:
- Each checkpoint MUST include a "citation" field with structured test and question references
- Citation format: array of objects with test number and question numbers
  Example: [{"test": 3, "questions": [12, 15]}, {"test": 7, "questions": [5, 22]}]
- Include 2-5 test instances per checkpoint showing the pattern across multiple tests
- Select questions that best demonstrate the recurring pattern identified
- Questions should come from the wrong_questions_by_test data provided

**Guidelines**:
- Return EXACTLY 5 paired checkpoints total (across all topics)
- Prioritize patterns that appear in multiple tests or affect multiple subtopics
- Focus on HIGH-IMPACT patterns that block long-term mastery
- **CRITICAL**: Each checkpoint MUST cite specific test numbers and question numbers as evidence
- Each checkpoint should reveal insights humans would miss by looking at individual tests
- Be SPECIFIC about the exact misconception, not vague (e.g., "confused X with Y" not "missed details")
- Actions should target systematic improvement, not quick fixes
- Actions should include concrete activities (e.g., "draw 10 diagrams", "solve 15 problems on X")
- Multiple checkpoints can be from the same topic if multiple distinct patterns exist
- Keep tone supportive yet honest about persistent issues
- Quality over brevity: use the full 20-25 word limit to be specific and evidence-based

**Important**:
- Return ONLY the JSON array of exactly 5 items
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above
- Each item MUST have "checkpoint", "action", and "citation" fields
- Focus on PATTERNS and EVOLUTION, not isolated mistakes
- **MANDATORY**: Citations must include structured test/question references for credibility and actionability
"""


@traceable()
def generate_cumulative_checkpoints(student_id, class_id, topics_data):
    """
    Generate cumulative checkpoints analyzing patterns across all tests.
    
    Args:
        student_id: Student identifier
        class_id: Class identifier
        topics_data: Dict with 'topics' list containing cumulative data
    
    Returns:
        list: List of 5 checkpoint dictionaries with checkpoint and action fields
    """
    try:
        if not topics_data or 'topics' not in topics_data or not topics_data['topics']:
            logger.info(f"No cumulative topics data for student {student_id} - no tests taken or perfect performance")
            return []
        
        # Prepare data for LLM
        topics_for_llm = []
        for topic_data in topics_data['topics']:
            topics_for_llm.append({
                'topic_metadata': topic_data['topic_metadata'],
                'wrong_questions_by_test': topic_data['wrong_questions_by_test']
            })
        
        # Build LLM prompt
        full_prompt = cumulative_checkpoint_prompt + "\n\n**Cumulative Topics Data**:\n" + json.dumps(topics_for_llm, indent=2)
        
        # Call Gemini with retry (structured)
        for attempt in range(3):
            try:
                result = call_gemini_api_with_rotation(full_prompt, "gemini-2.0-flash", return_structured=True)

                if isinstance(result, dict):
                    if result.get("ok"):
                        response = result.get("response", "") or ""
                    else:
                        logger.warning(f"Gemini structured error (cumulative checkpoints): code={result.get('code')} reason={result.get('reason')} model={result.get('model')} attempt={result.get('attempt')}")
                        response = ""
                else:
                    response = result or ""

                # Clean and parse response (reuse existing function)
                checkpoints = clean_checkpoint_response(response)

                if checkpoints and isinstance(checkpoints, list) and len(checkpoints) > 0:
                    logger.info(f"✅ Generated {len(checkpoints)} cumulative checkpoints for student {student_id}")
                    return checkpoints

                logger.warning(f"⚠️ Cumulative checkpoint response invalid (attempt {attempt + 1}), retrying...")

            except Exception as e:
                logger.warning(f"⚠️ Cumulative checkpoint generation attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
        
        # Fallback: return empty
        logger.error(f"❌ Failed to generate cumulative checkpoints after 3 attempts for student {student_id}")
        return []
        
    except Exception as e:
        logger.error(f"❌ Error in generate_cumulative_checkpoints: {e}", exc_info=True)
        return []
