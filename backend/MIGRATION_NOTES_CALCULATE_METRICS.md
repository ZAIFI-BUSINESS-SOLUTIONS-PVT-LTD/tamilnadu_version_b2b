# Migration Notes: Calculate Metrics (Neo4j → PostgreSQL)

## Overview
Migrated metrics calculation functions from Neo4j to PostgreSQL to remove Neo4j dependency for read operations.

## Changes Made

### 1. New PostgreSQL Functions (in `exam/graph_utils/calculate_metrics.py`)

#### `calculate_overall_performance_pg(student_id, class_id)`
- **Source Data**: `StudentResult` table
- **Logic**: Calculates overall performance percentage
  - Counts total questions and correct answers
  - Scoring: +4 for correct, -1 for incorrect
  - Returns: (total_score / max_possible_score) * 100
- **Output**: Float (percentage)

#### `fetch_tests_taken_count_pg(student_id, class_id)`
- **Source Data**: `StudentResult` table (distinct test_num count)
- **Logic**: Counts unique test numbers for the student
- **Output**: Integer (count)

#### `calculate_improvement_rate_pg(student_id, class_id)`
- **Source Data**: `StudentResult` table (aggregated by test_num)
- **Logic**: 
  - Calculates score per test (+4 correct, -1 incorrect)
  - Computes percentage change between consecutive tests
  - Averages all deltas
- **Output**: Float (percentage improvement)

#### `calculate_consistency_score_pg(student_id, class_id)`
- **Source Data**: `StudentResult` table (grouped by test, subject, topic)
- **Logic**:
  - Calculates accuracy per topic per test
  - For each topic: consistency_score = avg_accuracy / (1 + std_deviation)
  - Returns mean of all topic consistency scores
- **Output**: Float (0-1 range)

#### `calculate_metrics_pg(student_id, class_id)`
- **Main Entry Point**: Calls all above functions
- **Returns**: Tuple (op, tt, ir, cv)
  - op: Overall Performance (normalized by test count)
  - tt: Tests Taken count
  - ir: Improvement Rate
  - cv: Consistency Score

### 2. Updated Caller

#### `exam/insight/overview_data_generator.py`
- **Changed**: Import statement
  - Old: `from exam.graph_utils.calculate_metrics import calculate_metrics`
  - New: `from exam.graph_utils.calculate_metrics import calculate_metrics_pg`

- **Changed**: Function call in `Generate_overview_data()`
  - Old: `op, tt, ir, cv = calculate_metrics(db_name)`
  - New: `op, tt, ir, cv = calculate_metrics_pg(student_id, class_id)`
  - Added: Fallback to default values if student_id/class_id not provided

## Data Model Dependencies

### Required Tables
1. **StudentResult**: Main data source
   - Fields used: student_id, class_id, test_num, question_number, is_correct, subject, chapter, topic

### Query Patterns
- All queries filter by `student_id` and `class_id`
- Aggregations use Django ORM (Count, Sum, Case/When)
- Complex grouping operations use pandas for consistency with original logic

## Backward Compatibility

### Legacy Neo4j Functions (Kept)
- `calculate_overall_performance(kg_manager)`
- `fetch_tests_taken_count(kg_manager)`
- `calculate_improvement_rate(kg_manager)`
- `calculate_consistency_score(kg_manager)`
- `calculate_metrics(db_name)`

These remain in the file for backward compatibility but are no longer used in the main flow.

## Testing Recommendations

1. **Unit Tests**: Compare outputs between Neo4j and PostgreSQL functions for same student
2. **Integration Tests**: Verify `Generate_overview_data()` produces valid results
3. **Performance Tests**: Monitor query performance with large datasets
4. **Edge Cases**:
   - Student with no tests
   - Student with only 1 test (improvement rate should be 0)
   - Topics with no variation (consistency calculation)

## Performance Considerations

### Optimizations Applied
- Use Django ORM aggregations (efficient database queries)
- Single query per metric function (no N+1 problems)
- Use `.values()` and `.annotate()` for grouped aggregations

### Recommended Indexes
```sql
CREATE INDEX idx_studentresult_student_class ON exam_studentresult(student_id, class_id);
CREATE INDEX idx_studentresult_test ON exam_studentresult(test_num);
CREATE INDEX idx_studentresult_topic ON exam_studentresult(subject, topic);
```

## Rollback Plan
If issues arise:
1. Revert `overview_data_generator.py` import change
2. Change function call back to `calculate_metrics(db_name)`
3. Neo4j functions remain intact and functional

## Next Steps
1. Monitor production metrics after deployment
2. Add indexes if query performance is slow
3. Consider removing Neo4j functions after 30-day verification period
4. Migrate other graph_utils modules (retrieve_swot_data, retrieve_overview_data, etc.)
