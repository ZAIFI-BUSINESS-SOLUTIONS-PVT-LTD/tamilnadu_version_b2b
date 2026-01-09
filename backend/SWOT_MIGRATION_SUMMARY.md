# SWOT Data Migration Summary

## Completed Migration
Successfully migrated SWOT (Strengths, Weaknesses, Opportunities, Threats) data retrieval from Neo4j to PostgreSQL.

## Files Created

### 1. retrieve_swot_data_cumulative_pg.py
**Location**: `backend/exam/graph_utils/retrieve_swot_data_cumulative_pg.py`

**Purpose**: PostgreSQL version of cumulative SWOT analysis (across all tests)

**Key Functions**:
- `fetch_topic_scores_pg(student_id, class_id)` - Get topic-wise scores across all tests
- `fetch_correct_questions_pg(student_id, class_id, subject, topics)` - Get correct question details
- `fetch_wrong_questions_pg(student_id, class_id, subject, topics)` - Get incorrect question details  
- `fetch_question_type_scores_pg(student_id, class_id)` - Get question type performance
- `best_topics_pg(student_id, class_id)` - Identify strength topics (weighted score >= 0.6)
- `most_challenging_topics_pg(student_id, class_id)` - Identify weakness topics (weighted score < 0.9)
- `rapid_learning_pg(student_id, class_id)` - Topics with high improvement rate

**Data Flow**:
```
StudentResult (student_id, class_id, test_num, is_correct, subject, topic)
    ↓ (aggregate by test/subject/topic)
Topic Scores (TestName, Subject, Topic, Total, Correct)
    ↓ (calculate weighted_score = accuracy * log10(total+1))
    ↓ (filter by thresholds)
Best/Challenging Topics List
    ↓ (fetch question details)
QuestionAnalysis + StudentResponse (question text, feedback, misconceptions)
    ↓
Complete Question Records (returned as dict[subject → list[dict]])
```

### 2. retrieve_swot_data_pg.py
**Location**: `backend/exam/graph_utils/retrieve_swot_data_pg.py`

**Purpose**: PostgreSQL version of single-test SWOT analysis

**Key Functions**:
- `fetch_topic_scores_analysis_pg(student_id, class_id, test_num)` - Get topic scores for specific test
- `fetch_correct_questions_analysis_pg(student_id, class_id, test_num, subject, topics)`
- `fetch_wrong_questions_analysis_pg(student_id, class_id, test_num, subject, topics)`
- `fetch_question_type_scores_analysis_pg(student_id, class_id, test_num)`
- `best_topic_analysis_pg(student_id, class_id, test_num)` - Single-test strengths
- `most_challenging_topic_analysis_pg(student_id, class_id, test_num)` - Single-test weaknesses
- `rapid_learning_analysis_pg(student_id, class_id, test_num)` - Single-test patterns
- `strongest_question_type_analysis_pg(student_id, class_id, test_num)`
- `weakest_question_type_analysis_pg(student_id, class_id, test_num)`

**Difference from Cumulative**: Adds `test_num` parameter to filter results to a single test

## Files Modified

### 3. swot_generator.py
**Location**: `backend/exam/insight/swot_generator.py`

**Changes**:
1. **generate_all_test_swot_with_AI()**:
   - Added `student_id` and `class_id` parameters
   - Changed imports from `retrieve_swot_data_cumulative` to `retrieve_swot_data_cumulative_pg`
   - Replaced Neo4j `kg_manager` calls with PostgreSQL functions
   - Added fallback logic to extract student info from `db_name` (backward compatibility)
   - Removed Neo4j connection management

2. **generate_swot_data_with_AI()**:
   - Added `student_id` and `class_id` parameters  
   - Changed imports from `retrieve_swot_data` to `retrieve_swot_data_pg`
   - Replaced Neo4j `kg_manager` calls with PostgreSQL functions
   - Added fallback logic for backward compatibility

**Before**:
```python
def generate_all_test_swot_with_AI(db_name):
    from exam.graph_utils.retrieve_swot_data_cumulative import best_topics
    kg_manager = KnowledgeGraphManager(database_name=db_name)
    try:
        all_metric_results = {
            "TS_BPT": best_topics(kg_manager),
            ...
        }
    finally:
        kg_manager.close()
```

**After**:
```python
def generate_all_test_swot_with_AI(db_name, student_id=None, class_id=None):
    from exam.graph_utils.retrieve_swot_data_cumulative_pg import best_topics_pg
    # Extract student_id/class_id from db_name if not provided
    try:
        all_metric_results = {
            "TS_BPT": best_topics_pg(student_id, class_id),
            ...
        }
    except Exception as e:
        logger.exception(f"Error in generate_all_test_swot_with_AI: {e}")
        return {}
```

### 4. update_dashboard.py
**Location**: `backend/exam/services/update_dashboard.py`

**Changes**:
1. Updated cumulative SWOT call:
   ```python
   # Before
   generate_all_test_swot_with_AI(db_name)
   
   # After  
   generate_all_test_swot_with_AI(db_name, student_id, class_id)
   ```

2. Updated test-wise SWOT call:
   ```python
   # Before
   generate_swot_data_with_AI(db_name, test_num)
   
   # After
   generate_swot_data_with_AI(db_name, test_num, student_id, class_id)
   ```

**Note**: `student_id`, `class_id`, `test_num` are already in scope at the call site (passed to `_update_single_student_dashboard()`)

## Migration Approach

### Query Strategy
1. **Aggregation**: Use Django ORM `.annotate()` with `Count()` and `Sum(Case(When(...)))`
2. **Filtering**: Use `.filter()` with `student_id`, `class_id`, `test_num`, `is_correct`
3. **Joining**: Fetch from `StudentResult` first, then lookup `QuestionAnalysis` and `StudentResponse`
4. **Grouping**: Use `.values()` + `.annotate()` for GROUP BY behavior
5. **DataFrame**: Convert to pandas DataFrame for consistent output format (matches Neo4j version)

### Example Query Pattern
```python
# Step 1: Get aggregated scores
results = StudentResult.objects.filter(
    student_id=student_id,
    class_id=class_id
).values('test_num', 'subject', 'topic').annotate(
    total=Count('question_number'),
    correct=Sum(Case(When(is_correct=True, then=1), default=0))
)

# Step 2: Calculate weighted scores
df["WeightedScore"] = df.apply(
    lambda row: (row["Correct"]/row["Total"]) * math.log10(row["Total"]+1), 
    axis=1
)

# Step 3: Filter by threshold
best_df = df[df["WeightedScore"] >= 0.6]

# Step 4: Fetch question details for qualifying topics
for test_num, q_num in question_pairs:
    qa = QuestionAnalysis.objects.get(
        class_id=class_id, 
        test_num=test_num, 
        question_number=q_num
    )
    # Build record dict...
```

### Feedback Mapping Logic
Both versions use the same logic to map selected answer to feedback:
```python
# Map answer (A/B/C/D or 1/2/3/4) to option number (1/2/3/4)
option_map = {'A': '1', 'B': '2', 'C': '3', 'D': '4', '1': '1', '2': '2', '3': '3', '4': '4'}
option_num = option_map.get(str(selected_answer).strip().upper(), '1')

# Get feedback for that option
feedback = getattr(qa, f'option_{option_num}_feedback', '')
mis_type = getattr(qa, f'option_{option_num}_type', '')
mis_desc = getattr(qa, f'option_{option_num}_misconception', '')
```

## Validation Checklist

- [x] All functions migrated from Neo4j to PostgreSQL
- [x] Function signatures updated (kg_manager → student_id, class_id)
- [x] Output format preserved (dict[subject → list[dict]])
- [x] Weighted score calculation preserved
- [x] Threshold filtering preserved (0.6 for strengths, 0.9 for weaknesses)
- [x] Feedback mapping logic preserved
- [x] Callers updated (swot_generator.py, update_dashboard.py)
- [x] Backward compatibility added (db_name fallback)
- [x] Error handling added (try/except with logging)
- [x] No syntax errors (checked with linter)
- [ ] Unit tests written (TODO)
- [ ] Integration tests run (TODO)
- [ ] Performance validated (TODO)

## Active Metrics

Currently generating 3 active metrics (others commented out for now):

**Cumulative (All Tests)**:
- `TS_BPT` - Best Performing Topics (Strengths)
- `TW_MCT` - Most Challenging Topics (Weaknesses)
- `TO_RLT` - Rapid Learning Topics (Opportunities)

**Test-Specific**:
- `SS_BPT` - Single Test Best Topics
- `SW_MCT` - Single Test Most Challenging Topics
- `SO_RLT` - Single Test Rapid Learning Topics

Other metrics (IOT, SQT, WOT, LRT, PR, MO, RMCG, WHIT, IP) are commented out but functions exist - can be enabled by uncommenting.

## Next Steps

1. **Testing**: 
   - Write unit tests for each `_pg` function
   - Run integration test with real student data
   - Compare Neo4j vs PostgreSQL outputs (if Neo4j still available)

2. **Performance**:
   - Monitor query performance with production data
   - Add indexes if needed: `(student_id, class_id, test_num)` on StudentResult
   - Consider batch fetching optimization for QuestionAnalysis lookups

3. **Cleanup**:
   - After validation, deprecate old Neo4j functions
   - Remove Neo4j imports from swot_generator.py
   - Update documentation

4. **Other Modules**:
   - Migrate `retrieve_overview_data.py` (if not done)
   - Migrate `retrieve_performance_data.py`
   - Migrate any other Neo4j read functions

## Documentation Created
- [MIGRATION_NOTES_SWOT_DATA.md](./MIGRATION_NOTES_SWOT_DATA.md) - Detailed technical migration notes
- [SWOT_MIGRATION_SUMMARY.md](./SWOT_MIGRATION_SUMMARY.md) - This file (high-level summary)

## Related Work
- [MIGRATION_NOTES_CALCULATE_METRICS.md](./MIGRATION_NOTES_CALCULATE_METRICS.md) - Overview metrics migration (completed earlier)
