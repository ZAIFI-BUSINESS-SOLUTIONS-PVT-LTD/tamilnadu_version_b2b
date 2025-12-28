# PostgreSQL vs Neo4j Logic Verification

## ✅ Verified Components

### 1. **StudentResult Model**
- ✅ Added `was_attempted` field (Boolean, default=True)
- ✅ Distinguishes between incorrect attempts and skipped questions
- ✅ Matches Neo4j behavior: `WHERE q.optedAnswer IS NOT NULL`

### 2. **Scoring Formula (4/-1/0)**
**Neo4j Query Pattern:**
```cypher
SUM(CASE 
  WHEN q.isCorrect = true THEN 4 
  WHEN q.isCorrect = false AND q.optedAnswer IS NOT NULL THEN -1 
  ELSE 0 
END)
```

**PostgreSQL Equivalent:**
```python
Sum(Case(
    When(is_correct=True, was_attempted=True, then=4),
    When(is_correct=False, was_attempted=True, then=-1),
    default=0,
    output_field=IntegerField()
))
```

✅ **Verified in:**
- `retrieve_overview_data_pg.py`: `get_performance_trend_graph_pg()`, `get_test_wise_subject_score_pg()`
- `retrieve_performance_data_pg.py`: Chapter/topic accuracy calculations
- `calculate_metrics.py`: `calculate_overall_performance_pg()`, `calculate_improvement_rate_pg()`

### 3. **Filtering Logic**
**Neo4j:** `WHERE q.optedAnswer IS NOT NULL` (only attempted questions)

**PostgreSQL:** `filter(was_attempted=True)`

✅ **Verified in:**
- `fetch_topic_scores_analysis_pg()` - SWOT data
- `fetch_chapter_topic_graph_pg()` - Performance data  
- `get_consistency_vulnerability_data_pg()` - Overview data
- `fetch_question_type_scores_analysis_pg()` - SWOT question type analysis

### 4. **Weighted Score Calculation**
**Formula:** `accuracy * log10(total + 1)`

✅ **Both versions use:**
```python
def calculate_weighted_score(total, correct):
    if total == 0:
        return 0.0
    accuracy = correct / total
    return round(accuracy * math.log10(total + 1), 4)
```

✅ **Thresholds match:**
- `STRENGTH_WEIGHTED_THRESHOLD = 0.6`
- `WEAKNESS_WEIGHTED_THRESHOLD = 0.9`

### 5. **SWOT Topic Selection**
**Neo4j Logic:**
```cypher
WHERE weightedScore >= 0.6  // For strengths
WHERE weightedScore < 0.9   // For weaknesses
```

**PostgreSQL Logic:**
```python
strength_topics = df[df['weightedScore'] >= STRENGTH_WEIGHTED_THRESHOLD]
weakness_topics = df[df['weightedScore'] < WEAKNESS_WEIGHTED_THRESHOLD]
```

✅ **Verified identical** in both single-test and cumulative SWOT functions

### 6. **Improvement Rate Calculation**
**Formula:** Average of percentage deltas between consecutive tests

✅ **Both versions:**
```python
def calculate_improvement_rate(score_list):
    if len(score_list) < 2:
        return 0.0
    deltas = []
    for i in range(1, len(score_list)):
        prev = score_list[i - 1]
        curr = score_list[i]
        if prev == 0:
            continue
        delta = ((curr - prev) / abs(prev)) * 100
        deltas.append(delta)
    return round(sum(deltas) / len(deltas), 2) if deltas else 0.0
```

### 7. **Chapter Selection for Overview**
**Top Chapters (Key Strengths):**
- Neo4j: Top 5 per subject by weighted score
- PG: Top 5 per subject by weighted score ✅

**Middle Chapters (Improvement Areas):**  
- Neo4j: Middle 10 chapters (mid-5 to mid+5)
- PG: Middle 10 chapters (mid-5 to mid+5) ✅

**Least Consistent (Consistency Vulnerability):**
- Neo4j: Bottom 5 by `avg / (1 + std)`
- PG: Bottom 5 by `avg / (1 + std)` ✅

### 8. **Test-wise Subject Score Matrix**
✅ **Columns match:**
- `Test` (test name)
- `<Subject>` (score with 4/-1/0 formula)
- `<Subject>__correct`
- `<Subject>__incorrect`
- `<Subject>__unattempted`

### 9. **Question Metadata Extraction**
✅ **Both retrieve:**
- Question number, text, type
- Selected answer
- Feedback for selected option
- Misconception type & description
- Image description

### 10. **Backfill Script Logic**
✅ **Correctly determines:**
```python
selected_answer = response.selected_answer
was_attempted = (selected_answer in ['1', '2', '3', '4'])
is_correct = (was_attempted and qa.correct_answer == qa.option_X)
```

### 11. **StudentAnalyzer Real-time Logic**
✅ **Correctly populates:**
```python
opted_answer = item.get('OptedAnswer')
was_attempted = opted_answer is not None and str(opted_answer).strip() != ''
```

---

## 🔍 Key Differences Resolved

| Aspect | Neo4j | PostgreSQL (Before) | PostgreSQL (After) |
|--------|-------|---------------------|-------------------|
| Skipped vs Incorrect | `q.optedAnswer IS NULL` | No distinction | ✅ `was_attempted=False` |
| Scoring | `4/-1/0` | Only `is_correct` boolean | ✅ `4/-1/0` with `was_attempted` |
| Filtering | `WHERE q.optedAnswer IS NOT NULL` | No filter | ✅ `filter(was_attempted=True)` |
| Thresholds | `0.6` and `0.9` | Missing | ✅ Same constants |
| Question counts | Correct/Incorrect/Skipped | Only Correct/Incorrect | ✅ Separate counts |

---

## 📋 Migration Readiness Checklist

- [x] `was_attempted` field added to model
- [x] All PG queries use `was_attempted` for filtering
- [x] All scoring calculations use `4/-1/0` formula
- [x] Weighted score thresholds match Neo4j
- [x] Chapter selection logic matches Neo4j
- [x] Improvement rate calculation matches Neo4j
- [x] Test-wise matrix structure matches Neo4j
- [x] Backfill script correctly populates `was_attempted`
- [x] StudentAnalyzer correctly sets `was_attempted`
- [x] Question metadata extraction matches Neo4j

---

## 🚀 Ready for Migration

All logic has been verified to match Neo4j behavior exactly. Safe to proceed with:

1. Generate migration: `python backend/manage.py makemigrations`
2. Apply migration: `python backend/manage.py migrate`
3. Re-run backfill: `python backend/backfill_student_results.py --class-id <class>`
4. Regenerate dashboard metrics

---

## 📊 Expected After Migration

- ✅ All historical tests (1-12) visible in dashboards
- ✅ Scores match Neo4j calculations exactly
- ✅ SWOT analysis includes all tests
- ✅ Performance trends show complete history
- ✅ Overview metrics reflect cumulative data

