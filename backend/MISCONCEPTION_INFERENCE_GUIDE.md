# Misconception Inference System

## Overview

The system now supports two types of misconception data:

1. **Pre-authored misconceptions** (from question bank): Stored in `QuestionAnalysis` table per option (`option_1_misconception`, etc.)
2. **LLM-inferred misconceptions** (from student answers): Stored in `StudentResult.misconception` field as JSON

## LLM-Inferred Misconceptions

### Data Flow

1. **Trigger**: After student analysis completes (when `ENABLE_MISCONCEPTION_INFERENCE=true`)
2. **Input**: Wrong answers from `StudentResult` (attempted but incorrect)
3. **Processing**: 
   - Batch all wrong questions for a student+test
   - Call Gemini 2.5 Flash with structured prompt
   - Parse JSON response with type and text
4. **Storage**: JSON string in `StudentResult.misconception` field

### Misconception Types (6 categories)

```python
[
  "Conceptual Confusion",
  "Incorrect Formula or Law Application", 
  "Ignoring Given Conditions or Exceptions",
  "Overgeneralization of a Rule or Trend",
  "Misinterpretation of Diagram, Graph, or Representation",
  "Partial Concept Understanding"
]
```

### Storage Format

The `StudentResult.misconception` field stores a JSON string:

```json
{
  "type": "Conceptual Confusion",
  "text": "Student confused velocity with acceleration in uniformly accelerated motion"
}
```

### Retrieving Misconception Data

Use the helper functions in `exam/utils/misconception_helper.py`:

```python
from exam.utils.misconception_helper import parse_misconception, format_misconception_display

# Parse JSON or handle legacy plain text
parsed = parse_misconception(student_result.misconception)
# Returns: {'type': 'Conceptual Confusion', 'text': '...'}

# Format for display (includes type prefix)
display_text = format_misconception_display(student_result.misconception)
# Returns: "[Conceptual Confusion] Student confused..."

# Get just the type
misconception_type = get_misconception_type(student_result.misconception)

# Get just the text
misconception_text = get_misconception_text(student_result.misconception)
```

### Example LLM Response

**Input (multiple questions):**
```
Question 12: [Physics question about forces...]
Selected: B, Correct: C

Question 17: [Chemistry question about reactions...]
Selected: A, Correct: D
```

**Output (JSON):**
```json
{
  "12": {
    "type": "Incorrect Formula or Law Application",
    "text": "Student applied Newton's second law without considering friction forces"
  },
  "17": {
    "type": "Overgeneralization of a Rule or Trend",
    "text": "Student assumed all exothermic reactions are spontaneous"
  }
}
```

## File References

- **Inference logic**: `backend/exam/llm_call/misconception_inference.py`
- **Celery task**: `backend/exam/services/misconception_task.py`
- **Helper utilities**: `backend/exam/utils/misconception_helper.py`
- **Model**: `backend/exam/models/result.py` (StudentResult.misconception field)
- **Settings flag**: `ENABLE_MISCONCEPTION_INFERENCE` in `backend/inzighted/settings.py`

## Backward Compatibility

The helper functions handle both formats:
- **New format**: JSON with type and text
- **Legacy format**: Plain text (treated as text with null type)

Existing code that reads `StudentResult.misconception` will continue to work, but should migrate to using the helper functions for proper parsing.
