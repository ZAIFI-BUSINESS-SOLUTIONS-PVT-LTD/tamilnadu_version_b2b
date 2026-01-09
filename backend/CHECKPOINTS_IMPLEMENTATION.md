# Checkpoints Feature Implementation

## Overview
The Checkpoints feature combines checklist (problem identification) and action plan (remedial steps) into a single LLM call to ensure 1:1 alignment between problems and solutions.

**Two Modes**:
1. **Test-wise checkpoints** (test_num = specific test): Analyze single test performance
2. **Cumulative checkpoints** (test_num = 0): Analyze patterns across ALL tests taken

## Implementation Summary

### 1. Database Model
- **File**: `backend/exam/models/checkpoints.py`
- **Table**: `exam_checkpoints`
- **Fields**:
  - `class_id` (CharField)
  - `student_id` (CharField)
  - `test_num` (IntegerField)
  - `insights` (JSONField) - Stores array of 5 checkpoint objects
  - `created_at`, `updated_at` (DateTimeField)
- **Unique Constraint**: `(class_id, student_id, test_num)`
- **Migration**: `exam/migrations/0017_checkpoints.py`

### 2. LLM Generation Service
- **File**: `backend/exam/llm_call/checkpoint_generator.py`

#### Test-wise Generation
- **Function**: `generate_checkpoints_testwise(student_id, class_id, test_num, weak_topics_data)`
- **Prompt**: `checkpoint_prompt` - Combines checklist and action plan requirements
- **Output**: JSON array of 5 items, each with:
  ```json
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.45,
    "checkpoint": "Problem description (10-15 words)",
    "action": "Solution description (10-15 words)"
  }
  ```

#### Cumulative Generation (NEW)
- **Function**: `generate_cumulative_checkpoints(student_id, class_id, topics_data)`
- **Data Source**: `backend/exam/graph_utils/retrieve_cumulative_checkpoints_data.py`
- **Prompt**: `cumulative_checkpoint_prompt` - Analyzes patterns across ALL tests
- **Input Structure**:
  ```json
  {
    "topics": [
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
                "misconception_text": "Assumed action and reaction forces act on same object"
              }
            ]
          },
          {
            "test_id": "Test_8",
            "wrong_questions": [...]
          }
        ]
      }
    ]
  }
  ```
- **Analysis Focus**: 
  - Recurring misconceptions across tests
  - Evolution of errors (conceptual → application)
  - Persistent blind spots despite improvement
  - Hidden patterns humans cannot identify
  - Root conceptual gaps blocking mastery
- **Output**: Same format as test-wise (5 paired items)
- **Retry Logic**: 3 attempts with Gemini 2.0 Flash
- **Validation**: Ensures required fields and proper structure

### 3. Celery Task
- **File**: `backend/exam/services/checkpoint_task.py`

#### Test-wise Task
- **Task**: `populate_checkpoints_testwise(student_id, class_id, test_num)`
- **Steps**:
  1. Fetch weak topics data using `get_action_plan_data()`
  2. Call LLM via `generate_checkpoints_testwise()`
  3. Store JSON in `Checkpoints.insights` using `update_or_create()`
- **Retry**: Max 3 retries with 60s delay

#### Cumulative Task (NEW)
- **Task**: `populate_checkpoints_cumulative(student_id, class_id)`
- **Steps**:
  1. Fetch all-tests data using `get_cumulative_checkpoints_data()`
  2. Call LLM via `generate_cumulative_checkpoints()`
  3. Store JSON in `Checkpoints.insights` with **test_num=0** using `update_or_create()`
- **Retry**: Max 3 retries with 60s delay
- **Data Source**: Queries `StudentResult` table for all wrong answers across all tests
- **Grouping**: Groups by topic, calculates metrics across all tests
- **Misconception Parsing**: Extracts type and text from `StudentResult.misconception` field

### 4. Integration Points
- **File**: `backend/exam/services/update_dashboard.py`
- **Location**: After study tips generation in `_internal_student_dashboard_update()`

#### Test-wise Trigger
- **Trigger**: Async Celery task when `ENABLE_CHECKPOINTS` is True
- **Code**:
  ```python
  if getattr(settings, 'ENABLE_CHECKPOINTS', False) and test_num:
      populate_checkpoints_testwise.delay(student_id, class_id, test_num)
  ```

#### Cumulative Trigger (NEW)
- **Trigger**: Async Celery task when `ENABLE_CUMULATIVE_CHECKPOINTS` is True
- **Timing**: Runs AFTER test-wise checkpoint generation
- **Code**:
  ```python
  if getattr(settings, 'ENABLE_CUMULATIVE_CHECKPOINTS', False):
      populate_checkpoints_cumulative.delay(student_id, class_id)
  ```
- **Note**: Cumulative generation is independent of specific test_num

### 5. API Endpoint
- **File**: `backend/exam/views/student_views.py`
- **Endpoint**: `POST /api/student/checkpoints/`
- **Request Body**: `{"test_num": <test_number>}`
  - Use `test_num=0` to retrieve cumulative checkpoints
  - Use `test_num=1,2,3...` to retrieve test-specific checkpoints
- **Response**:
  ```json
  {
    "checkpoints": [
      {
        "topic": "...",
        "subject": "...",
        "accuracy": 0.45,
        "checkpoint": "...",
        "action": "..."
      }
    ]
  }
  ```
- **Auth**: Requires `IsAuthenticated` permission

### 6. Feature Flags
- **File**: `backend/inzighted/settings.py`

#### Test-wise Flag
- **Setting**: `ENABLE_CHECKPOINTS`
- **Environment Variable**: `ENABLE_CHECKPOINTS=true` (default: false)
- **Usage**: Gates test-specific checkpoint generation

#### Cumulative Flag (NEW)
- **Setting**: `ENABLE_CUMULATIVE_CHECKPOINTS`
- **Environment Variable**: `ENABLE_CUMULATIVE_CHECKPOINTS=true` (default: false)
- **Usage**: Gates cumulative (all-tests) checkpoint generation
- **Independent**: Can be enabled separately from `ENABLE_CHECKPOINTS`

## Data Flow

### Test-wise Flow
1. **Test Analysis** → Student takes test, responses stored
2. **Dashboard Update** → `update_dashboard.py` triggers overview population
3. **Overview Generation** → Action plan, checklist, study tips generated (existing flow)
4. **Checkpoint Task** (if enabled) → Async Celery task triggered
5. **LLM Call** → Single call to Gemini 2.0 Flash with combined prompt
6. **Storage** → JSON stored in `Checkpoints.insights` with specific test_num
7. **API Retrieval** → Frontend fetches via `POST /api/student/checkpoints/`

### Cumulative Flow (NEW)
1. **Trigger** → After test-wise checkpoint generation (or independent run)
2. **Data Collection** → Query all `StudentResult` records for student
   - Filter: `is_correct=False`, `was_attempted=True`
   - Group by: `topic` (subject, chapter, topic)
   - Extract: `misconception` field from each wrong answer
3. **Metric Calculation** → For each topic:
   - Total questions attempted (all tests)
   - Accuracy percentage
   - Weighted accuracy
   - Improvement rate (first test → last test)
4. **Misconception Parsing** → Extract type and text from JSON/text field
5. **Structure Building** → Create input format for LLM:
   - `topic_metadata` with aggregated metrics
   - `wrong_questions_by_test` array (chronologically ordered)
6. **Pattern Analysis** → LLM identifies:
   - Recurring misconceptions across tests
   - Evolution of errors (conceptual → application)
   - Persistent blind spots
   - Hidden patterns humans miss
7. **Storage** → JSON stored with **test_num=0** in `Checkpoints` table
8. **API Retrieval** → Frontend fetches with `{"test_num": 0}`

## Key Design Decisions

### Why Combined Call?
- **Problem**: Separate actionplan and checklist calls produced misaligned insights
- **Solution**: Single LLM call ensures checkpoint #1 problem maps to action #1 solution
- **Benefit**: Better UX - students see clear problem-solution pairs

### Why test_num=0 for Cumulative? (NEW)
- **Convention**: `test_num=0` indicates cumulative/overall data (not test-specific)
- **Compatibility**: Fits existing schema without new tables or migrations
- **API Simplicity**: Same endpoint, different `test_num` parameter
- **Storage Efficiency**: One row per student for cumulative insights

### Why Separate Cumulative Analysis? (NEW)
- **Pattern Detection**: Humans cannot easily spot recurring mistakes across 10+ tests
- **Longitudinal View**: Tracks learning evolution over time
- **Root Cause Focus**: Identifies persistent conceptual gaps, not surface-level errors
- **Actionable Insights**: Targets systematic improvement vs. test-specific fixes
- **LLM Strength**: AI excels at pattern recognition across large datasets

### Why Misconceptions Instead of Raw Questions? (NEW)
- **Data Volume**: Raw questions for 50+ tests = huge prompt (exceeds token limits)
- **Relevance**: Misconception text is pre-filtered insight from wrong answers
- **Efficiency**: LLM analyzes patterns in misconceptions, not re-analyzing full questions
- **Consistency**: Reuses existing `StudentResult.misconception` field populated during analysis

### Why Separate Table?
- **Isolation**: New feature doesn't affect existing actionplan/checklist metrics
- **Performance**: JSON storage optimized for bulk retrieval
- **Flexibility**: Easy to extend with overall/cumulative checkpoints later (✅ now implemented)

### Why Async Task?
- **Non-blocking**: Dashboard generation completes faster
- **Retry Logic**: Handles transient LLM failures
- **Scalability**: Multiple students processed in parallel
- **Resource Management**: Heavy LLM calls don't block web requests

## Testing

### Enable Features
```bash
# Add to .env file
ENABLE_CHECKPOINTS=true                    # Test-wise checkpoints
ENABLE_CUMULATIVE_CHECKPOINTS=true         # Cumulative checkpoints (NEW)
```

### Trigger Generation
- Upload answer key and student responses for a test
- Dashboard update will automatically trigger:
  1. Test-wise checkpoint generation (if enabled)
  2. Cumulative checkpoint generation (if enabled, runs after test-wise)
- Check logs for: "🔍 Triggered checkpoints generation..." and "🔍 Triggered cumulative checkpoints generation..."

### Verify Data
```python
from exam.models.checkpoints import Checkpoints

# Check test-wise checkpoint
cp_test = Checkpoints.objects.filter(student_id='...', test_num=1).first()
print(cp_test.insights)  # Should show 5 checkpoint objects

# Check cumulative checkpoint (NEW)
cp_cumulative = Checkpoints.objects.filter(student_id='...', test_num=0).first()
print(cp_cumulative.insights)  # Should show 5 pattern-based checkpoint objects
```

### Test APIs
```bash
# Test-wise checkpoint (specific test)
curl -X POST http://localhost:8000/api/student/checkpoints/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 1}'

# Cumulative checkpoint (all tests) - NEW
curl -X POST http://localhost:8000/api/student/checkpoints/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"test_num": 0}'
```

### Manual Task Execution
```python
# Django shell
from exam.services.checkpoint_task import populate_checkpoints_cumulative

# Run cumulative task manually
populate_checkpoints_cumulative('student_id', 'class_id')
```

### Run Unit Tests
```bash
cd backend
python manage.py test exam.tests.test_cumulative_checkpoints
```

## Future Enhancements

1. **Overall Checkpoints**: Generate cumulative checkpoints across all tests
2. **Topic Filtering**: Filter checkpoints by subject/chapter
3. **Progress Tracking**: Track which actions students have completed
4. **Educator View**: Show class-wide checkpoint trends
5. **Frontend UI**: Dedicated checkpoint visualization component

## Files Modified/Created

### Created
- `backend/exam/models/checkpoints.py`
- `backend/exam/llm_call/checkpoint_generator.py`
- `backend/exam/services/checkpoint_task.py`
- `backend/exam/migrations/0017_checkpoints.py`
- `backend/exam/graph_utils/retrieve_cumulative_checkpoints_data.py` ✨ NEW
- `backend/exam/tests/test_cumulative_checkpoints.py` ✨ NEW

### Modified
- `backend/exam/models/__init__.py` (import Checkpoints)
- `backend/exam/services/update_dashboard.py` (hook checkpoint tasks)
- `backend/exam/views/student_views.py` (add API endpoint)
- `backend/inzighted/urls.py` (add URL route)
- `backend/inzighted/settings.py` (add feature flags)
- `backend/exam/llm_call/checkpoint_generator.py` (add cumulative function) ✨ UPDATED
- `backend/exam/services/checkpoint_task.py` (add cumulative task) ✨ UPDATED

## Dependencies

- Existing: `retrieve_action_plan_data()` - Reuses weak topics data (test-wise)
- Existing: `call_gemini_api_with_rotation()` - LLM API wrapper
- Existing: Celery task infrastructure
- Existing: `Checkpoints` model and migration
- NEW: `StudentResult` model - Source for cumulative data
- NEW: `get_cumulative_checkpoints_data()` - Aggregates all-tests data
- NEW: `generate_cumulative_checkpoints()` - Pattern analysis LLM call

## Notes

- **Test-wise** feature is **disabled by default** - requires `ENABLE_CHECKPOINTS=true`
- **Cumulative** feature is **disabled by default** - requires `ENABLE_CUMULATIVE_CHECKPOINTS=true`
- Features are **independent** - can enable either or both
- Does **not affect** existing actionplan/checklist metrics
- Test-wise generates **5 paired checkpoints** for specific test
- Cumulative generates **5 pattern-based checkpoints** across all tests
- Uses **Gemini 2.0 Flash** (same as existing metrics)
- Stores **test-wise with test_num=1,2,3...** and **cumulative with test_num=0**
- Cumulative task runs **after** test-wise task in dashboard update pipeline
- API endpoint works for both modes using same structure with different `test_num`

## Backward Compatibility

✅ **Fully backward compatible**:
- Existing test-wise checkpoint functionality unchanged
- New cumulative feature is additive only
- Same database table, same API endpoint
- No schema changes required
- Legacy deployments work without cumulative feature enabled
- Independent feature flags allow gradual rollout
