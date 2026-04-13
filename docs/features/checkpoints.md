# Checkpoints Feature

## Overview

Checkpoints pair a **problem** (checklist item) and a **solution** (action plan) in a single LLM call, ensuring 1:1 alignment. Each student gets 5 checkpoint objects per analysis.

Two modes are supported:
- **Test-wise** (`test_num = 1, 2, 3…`): Analyzes a single test's performance
- **Cumulative** (`test_num = 0`): Analyzes patterns across **all** tests taken

---

## Feature Flags

In `backend/inzighted/settings.py` (set via environment variables):

```bash
ENABLE_CHECKPOINTS=true              # test-wise generation (default: false)
ENABLE_CUMULATIVE_CHECKPOINTS=true   # cumulative generation (default: false)
```

Both are **disabled by default** and are independent — either or both can be enabled.

---

## Data Model

**File:** `backend/exam/models/checkpoints.py` | **Table:** `exam_checkpoints`

| Field | Type | Notes |
|-------|------|-------|
| `class_id` | CharField | |
| `student_id` | CharField | |
| `test_num` | IntegerField | `0` = cumulative, `1,2,3…` = test-specific |
| `insights` | JSONField | Array of 5 checkpoint objects |
| `created_at`, `updated_at` | DateTimeField | |

**Unique constraint:** `(class_id, student_id, test_num)`
**Migration:** `exam/migrations/0017_checkpoints.py`

### Checkpoint Object Shape
```json
{
  "topic": "Newton's Laws",
  "subject": "Physics",
  "accuracy": 0.45,
  "checkpoint": "Problem description in 10-15 words",
  "action": "Solution description in 10-15 words"
}
```

---

## API Endpoint

**File:** `backend/exam/views/student_views.py`

```
POST /api/student/checkpoints/
Authorization: Bearer <student_token>

Body: { "test_num": 1 }    # or 0 for cumulative
```

Response:
```json
{ "checkpoints": [ { "topic": "...", "subject": "...", "accuracy": 0.45, "checkpoint": "...", "action": "..." } ] }
```

---

## Generation Pipeline

### Test-wise Flow
1. Student takes test → results stored in `StudentResult`
2. `update_dashboard.py` → triggers `populate_checkpoints_testwise.delay(student_id, class_id, test_num)`
3. Celery task fetches weak topics via `get_action_plan_data()`
4. LLM call: `generate_checkpoints_testwise()` → Gemini 2.0 Flash
5. 5 checkpoint objects stored in `Checkpoints.insights` with specific `test_num`

### Cumulative Flow
1. Runs after test-wise (or independently)
2. Triggers `populate_checkpoints_cumulative.delay(student_id, class_id)`
3. Queries all `StudentResult` records (`is_correct=False, was_attempted=True`)
4. Groups by topic; calculates: total attempts, accuracy, weighted accuracy, improvement rate
5. Extracts misconception types and text from `StudentResult.misconception`
6. LLM call: `generate_cumulative_checkpoints()` → pattern analysis across all tests
7. Stored with `test_num=0`

### LLM Analysis Focus (Cumulative)
- Recurring misconceptions across multiple tests
- Error evolution (conceptual → application)
- Persistent blind spots despite improvement
- Hidden patterns humans cannot spot
- Root conceptual gaps blocking mastery

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/exam/models/checkpoints.py` | Model definition |
| `backend/exam/llm_call/checkpoint_generator.py` | LLM generation (test-wise + cumulative) |
| `backend/exam/services/checkpoint_task.py` | Celery tasks |
| `backend/exam/graph_utils/retrieve_cumulative_checkpoints_data.py` | Aggregates all-tests data for cumulative |
| `backend/exam/services/update_dashboard.py` | Trigger point in dashboard update pipeline |
| `backend/exam/tests/test_cumulative_checkpoints.py` | Unit tests |

---

## LLM Prompt Design

Both prompts share requirements:
- **Action plan** — prescriptive, HOW to fix (motivational, student-friendly, action verbs: practice/revise/focus/review)
- **Checklist** — descriptive, WHAT the problem is
- Ranked by: **impact** (performance improvement potential) + **actionability** (clear, achievable)
- Must reference specific topic/subject — no generic advice like "practice more"

---

## Testing

```bash
# Enable features
echo "ENABLE_CHECKPOINTS=true" >> .env
echo "ENABLE_CUMULATIVE_CHECKPOINTS=true" >> .env

# Test-wise checkpoint API
curl -X POST http://localhost:8000/api/student/checkpoints/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 1}'

# Cumulative checkpoint API
curl -X POST http://localhost:8000/api/student/checkpoints/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 0}'
```

```python
# Verify data in Django shell
from exam.models.checkpoints import Checkpoints

cp = Checkpoints.objects.filter(student_id='...', test_num=1).first()
print(cp.insights)  # 5 test-wise checkpoints

cp_cum = Checkpoints.objects.filter(student_id='...', test_num=0).first()
print(cp_cum.insights)  # 5 pattern-based checkpoints

# Manually trigger cumulative task
from exam.services.checkpoint_task import populate_checkpoints_cumulative
populate_checkpoints_cumulative('student_id', 'class_id')
```

```bash
# Run unit tests
cd backend && python manage.py test exam.tests.test_cumulative_checkpoints
```

---

## Design Notes

- **Combined LLM call** ensures checkpoint #N problem maps to action #N solution (separate calls caused misalignment)
- **`test_num=0` convention** avoids new tables/migrations for cumulative; same API, same schema
- **Async Celery** keeps dashboard generation fast; handles retries (3 attempts, 60s delay)
- **Misconceptions as input** (not raw questions) avoids token limit issues across 50+ tests
- Fully backward compatible — disabled by default, additive to existing actionplan/checklist metrics
