# Neo4j → PostgreSQL Migration

## Status: Complete

All SWOT analysis and metrics calculation that previously required live Neo4j queries have been migrated to PostgreSQL. Neo4j is still used for **writing** knowledge graphs during test ingestion (`create_graph.py`), but all read/analytics paths now use PostgreSQL.

---

## What Was Migrated

### 1. SWOT Data Retrieval

| Neo4j file (old) | PostgreSQL file (new) | Status |
|------------------|-----------------------|--------|
| `retrieve_swot_data.py` | `retrieve_swot_data_pg.py` | Primary |
| `retrieve_swot_data_cumulative.py` | `retrieve_swot_data_cumulative_pg.py` | Primary |
| `topic_swot.py` | `topic_swot_pg.py` | Wrapper (imports from `_pg`) |
| `topic_swot_cumulative.py` | `topic_swot_cumulative_pg.py` | Wrapper (imports from `_pg`) |

All files are in `backend/exam/graph_utils/`. Use the `_pg` variants — the legacy filenames are kept only for compatibility reference.

### 2. Metrics Calculation

**File:** `backend/exam/graph_utils/calculate_metrics.py`

New PostgreSQL functions added alongside existing Neo4j ones:

| Function | Source Table | Notes |
|----------|-------------|-------|
| `calculate_overall_performance_pg(student_id, class_id)` | `StudentResult` | +4 correct / -1 incorrect / 0 skipped |
| `fetch_tests_taken_count_pg(student_id, class_id)` | `StudentResult` | distinct test_num count |

### 3. Scoring Formula

The PostgreSQL formula mirrors Neo4j exactly:

```python
# Neo4j (Cypher)
SUM(CASE WHEN q.isCorrect = true THEN 4
         WHEN q.isCorrect = false AND q.optedAnswer IS NOT NULL THEN -1
         ELSE 0 END)

# PostgreSQL equivalent
SUM(CASE WHEN is_correct = True THEN 4
         WHEN is_correct = False AND was_attempted = True THEN -1
         ELSE 0 END)
```

`StudentResult.was_attempted` (Boolean, default=True) was added to distinguish incorrect attempts from skipped questions — matching Neo4j's `q.optedAnswer IS NOT NULL` pattern.

---

## Key Functions (PostgreSQL)

### `retrieve_swot_data_cumulative_pg.py`
- `fetch_topic_scores_pg(student_id, class_id)` — topic performance across all tests
- `fetch_correct_questions_pg(student_id, class_id, subject, topics)` — correct question details
- `fetch_wrong_questions_pg(student_id, class_id, subject, topics)` — incorrect question details
- `fetch_all_questions_pg(student_id, class_id)` — all attempted questions
- `fetch_question_type_scores_pg(student_id, class_id)` — performance by question type
- `best_topics_pg(student_id, class_id)` — strength topics (weighted score ≥ 0.6)
- `most_challenging_topics_pg(student_id, class_id)` — weakness topics (weighted score < 0.9)
- `rapid_learning_pg(student_id, class_id)` — topics with high improvement rate

### `retrieve_swot_data_pg.py`
- Per-test equivalents of the cumulative functions above

---

## Validation

Migration was validated against Neo4j output for:
- Data retrieval logic and field names
- Calculation formulas (scoring, weighted scores)
- Output format and structure
- Attempted vs. skipped question distinction

Status: **Verified complete** (December 2025).

---

## What Still Uses Neo4j

Knowledge graph **creation** during test ingestion remains in Neo4j:
- `backend/exam/graph_utils/create_graph.py` — writes student→question relationships after answer upload
- `backend/exam/graph_utils/knowledge_graph_manager.py` — graph connection management

Neo4j is not required for read/analytics paths.
