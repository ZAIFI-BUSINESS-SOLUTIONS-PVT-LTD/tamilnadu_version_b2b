# Misconception Inference System

## Overview

Two types of misconception data are supported:

1. **Pre-authored misconceptions** — defined in question bank; stored in `QuestionAnalysis` table per option (`option_1_misconception`, etc.)
2. **LLM-inferred misconceptions** — generated from student wrong answers; stored in `StudentResult.misconception` as JSON

---

## LLM-Inferred Misconceptions

### Feature Flag

```bash
ENABLE_MISCONCEPTION_INFERENCE=true   # default: false, set in backend/inzighted/settings.py
```

### Data Flow

1. Trigger: after student analysis completes (if `ENABLE_MISCONCEPTION_INFERENCE=true`)
2. Input: wrong answers from `StudentResult` (`attempted=True, is_correct=False`)
3. Processing: batch all wrong questions for student+test → call Gemini 2.5 Flash → parse JSON
4. Storage: JSON string in `StudentResult.misconception`

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

```json
{
  "type": "Conceptual Confusion",
  "text": "Student confused velocity with acceleration in uniformly accelerated motion"
}
```

### LLM Response Example

Input: wrong answers for question 12 and 17  
Output:
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

---

## Helper Utilities

**File:** `backend/exam/utils/misconception_helper.py`

```python
from exam.utils.misconception_helper import (
    parse_misconception,
    format_misconception_display,
    get_misconception_type,
    get_misconception_text
)

# Parse JSON or handle legacy plain text
parsed = parse_misconception(result.misconception)
# → {'type': 'Conceptual Confusion', 'text': '...'}

# Format for display (includes type prefix)
display = format_misconception_display(result.misconception)
# → "[Conceptual Confusion] Student confused..."
```

Handles both new JSON format and legacy plain text strings.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/exam/llm_call/misconception_inference.py` | LLM call logic |
| `backend/exam/services/misconception_task.py` | Celery task |
| `backend/exam/utils/misconception_helper.py` | Parse/display helpers |
| `backend/exam/models/result.py` | `StudentResult.misconception` field |
