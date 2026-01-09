# SWOT Data Retrieval Migration Notes (Neo4j → PostgreSQL)

## Migration Date
**Date**: 2024 (Current Session)

## Overview
Successfully migrated SWOT data retrieval functions from Neo4j graph queries to PostgreSQL table queries. This migration removes Neo4j dependency for SWOT analysis while maintaining identical output formats and analysis logic.

## Files Created/Modified

### New Files Created
1. **backend/exam/graph_utils/retrieve_swot_data_cumulative_pg.py**
   - PostgreSQL version of cumulative SWOT data functions
   - Functions work across all tests for a student
   - Key functions:
     - `fetch_topic_scores_pg(student_id, class_id)` - Topic performance across tests
     - `fetch_correct_questions_pg(student_id, class_id, subject, topics)` - Correct question details
     - `fetch_wrong_questions_pg(student_id, class_id, subject, topics)` - Wrong question details
     - `fetch_question_type_scores_pg(student_id, class_id)` - Question type performance
     - `best_topics_pg(student_id, class_id)` - Strength analysis
     - `most_challenging_topics_pg(student_id, class_id)` - Weakness analysis
     - `rapid_learning_pg(student_id, class_id)` - Learning velocity analysis

2. **backend/exam/graph_utils/retrieve_swot_data_pg.py**
   - PostgreSQL version of test-specific SWOT data functions
   - Functions work for a single test
   - Key functions:
     - `fetch_topic_scores_analysis_pg(student_id, class_id, test_num)` - Single test topic scores
     - `fetch_correct_questions_analysis_pg(student_id, class_id, test_num, subject, topics)`
     - `fetch_wrong_questions_analysis_pg(student_id, class_id, test_num, subject, topics)`
     - `fetch_question_type_scores_analysis_pg(student_id, class_id, test_num)`
     - `best_topic_analysis_pg(student_id, class_id, test_num)` - Single test strengths
     - `most_challenging_topic_analysis_pg(student_id, class_id, test_num)` - Single test weaknesses
     - `rapid_learning_analysis_pg(student_id, class_id, test_num)` - Single test learning patterns
     - `strongest_question_type_analysis_pg(student_id, class_id, test_num)`
     - `weakest_question_type_analysis_pg(student_id, class_id, test_num)`

### Files Modified
1. **backend/exam/insight/swot_generator.py**
   - Updated `generate_all_test_swot_with_AI()` to accept `student_id` and `class_id` parameters
   - Changed imports from `retrieve_swot_data_cumulative` to `retrieve_swot_data_cumulative_pg`
   - Replaced `kg_manager` (Neo4j) with `student_id, class_id` (PostgreSQL)
   - Added fallback logic to extract student info from `db_name` for backward compatibility
   - Updated `generate_swot_data_with_AI()` similarly for test-specific analysis
   - Changed imports from `retrieve_swot_data` to `retrieve_swot_data_pg`
   - Removed Neo4j connection management (`kg_manager.close()`)

2. **backend/exam/services/update_dashboard.py**
   - Updated SWOT generator calls to pass `student_id` and `class_id`:
     - `generate_all_test_swot_with_AI(db_name, student_id, class_id)`
     - `generate_swot_data_with_AI(db_name, test_num, student_id, class_id)`
   - Functions already have these parameters in scope (passed from task caller)

## Technical Implementation

### Data Sources (PostgreSQL Tables)
1. **StudentResult** - Primary performance data
   - Columns: `student_id`, `class_id`, `test_num`, `question_number`, `subject`, `topic`, `chapter`, `is_correct`
   - Used for: Topic scores, question type scores, correctness filtering

2. **QuestionAnalysis** - Question metadata and feedback
   - Columns: `class_id`, `test_num`, `question_number`, `question_text`, `topic`, `subtopic`, `typeOfquestion`, `option_1_feedback`, `option_1_type`, `option_1_misconception`, etc.
   - Used for: Question details, feedback messages, misconception types

3. **StudentResponse** - Student's selected answers
   - Columns: `student_id`, `class_id`, `test_num`, `question_number`, `selected_answer`
   - Used for: Mapping selected answer to correct feedback option

### Key Logic Preserved
1. **Weighted Score Calculation**
   ```python
   weighted_score = accuracy * log10(total + 1)
   ```
   - Higher score for better accuracy on more questions

2. **Improvement Rate Calculation**
   ```python
   improvement_rate = avg([(curr - prev) / |prev| * 100])
   ```
   - Calculates average percentage change across test sequence

3. **Threshold Filtering**
   - `STRENGTH_WEIGHTED_THRESHOLD = 0.6` - Topics must score >= 0.6 to qualify as strengths
   - `WEAKNESS_WEIGHTED_THRESHOLD = 0.9` - Topics must score < 0.9 to qualify as weaknesses

4. **Feedback Mapping Logic**
   - Maps selected answer (A/B/C/D or 1/2/3/4) to option number (1/2/3/4)
   - Retrieves corresponding `option_N_feedback`, `option_N_type`, `option_N_misconception` from QuestionAnalysis

### Output Format (Unchanged)
Both Neo4j and PostgreSQL versions return:
```python
{
    "Subject1": [
        {
            "TestName": "Test1",
            "Topic": "Topic Name",
            "Subtopic": "Subtopic Name",
            "QuestionNumber": 5,
            "OptedAnswer": "B",
            "QuestionText": "Question text...",
            "Type": "MCQ",
            "ImgDesc": "Image description",
            "Feedback": "Feedback text...",
            "MisType": "Conceptual",
            "MisDesc": "Misconception description",
            "IsCorrect": True
        },
        ...
    ],
    "Subject2": [...],
    ...
}
```

## Testing Recommendations

### Unit Tests Needed
1. **fetch_topic_scores_pg()**
   - Test with student who has multiple tests
   - Verify correct aggregation (Total, Correct counts)
   - Check test ordering

2. **fetch_correct/wrong_questions_pg()**
   - Test topic filtering
   - Verify feedback mapping logic
   - Check empty result handling

3. **best_topics_pg() / most_challenging_topics_pg()**
   - Test weighted score calculation
   - Verify threshold filtering
   - Test subject grouping

4. **Analysis functions with test_num**
   - Verify single-test filtering works correctly
   - Compare output with cumulative version structure

### Integration Tests
1. **swot_generator.py**
   - Call `generate_all_test_swot_with_AI()` with real student data
   - Verify all metric keys present (TS_BPT, TW_MCT, TO_RLT)
   - Check LLM insight generation still works

2. **update_dashboard.py**
   - Run full dashboard update with new functions
   - Verify SWOT data saved to database correctly
   - Check no Neo4j connections attempted

### Comparison Tests
```python
# Compare old vs new output (if Neo4j still available)
neo4j_result = best_topics(kg_manager)
pg_result = best_topics_pg(student_id, class_id)
assert_structure_match(neo4j_result, pg_result)
```

## Rollback Plan

### If Issues Found
1. **Revert swot_generator.py**:
   ```python
   # Change back to:
   from exam.graph_utils.retrieve_swot_data_cumulative import best_topics
   # ...
   best_topics(kg_manager)
   ```

2. **Revert update_dashboard.py**:
   ```python
   # Remove student_id, class_id parameters:
   generate_all_test_swot_with_AI(db_name)
   ```

3. Keep new `*_pg.py` files for future use but don't call them

### Legacy Support
- Functions in `swot_generator.py` include fallback logic to extract `student_id`/`class_id` from `db_name`
- Can call with old signature: `generate_all_test_swot_with_AI(db_name)` (will query Student model)
- Recommended: Always pass explicit parameters for performance

## Performance Considerations

### Expected Improvements
1. **Reduced Complexity**: Direct table queries vs graph traversal
2. **Connection Overhead**: No Neo4j connection setup/teardown
3. **Query Efficiency**: PostgreSQL indexes on `student_id`, `class_id`, `test_num`

### Potential Bottlenecks
1. **Large Result Sets**: If student has many tests, `fetch_topic_scores_pg()` returns large DataFrame
   - Mitigation: Add pagination or test_num range filtering if needed

2. **QuestionAnalysis Lookups**: Fetching question details in loop
   - Current: One query per question
   - Optimization: Batch fetch all question_numbers, then use `objects.in_bulk()`

3. **Feedback Mapping**: `getattr()` calls for each question
   - Acceptable for current scale (typically < 100 questions per test)

### Optimization Example (if needed)
```python
# Instead of:
for q_num in question_numbers:
    qa = QuestionAnalysis.objects.get(...)

# Use:
qa_dict = QuestionAnalysis.objects.in_bulk(
    field_name='question_number',
    id_list=question_numbers
)
for q_num in question_numbers:
    qa = qa_dict[q_num]
```

## Dependencies Changed

### Removed
- `KnowledgeGraphManager` (Neo4j connection)
- Neo4j Cypher queries
- Graph traversal logic

### Added
- Django ORM queries
- Pandas DataFrame operations
- `StudentResult`, `QuestionAnalysis`, `StudentResponse` model imports

### Unchanged
- LLM integration (Gemini API calls)
- Prompt templates
- Insight extraction logic
- SWOT model saving

## Next Steps

1. **Testing**: Run integration tests with real student data
2. **Monitoring**: Add logging to track PostgreSQL query performance
3. **Optimization**: Implement batch fetching if performance issues arise
4. **Documentation**: Update API docs to reflect new function signatures
5. **Cleanup**: After validation, remove old Neo4j functions (or mark deprecated)

## Related Migrations
- `MIGRATION_NOTES_CALCULATE_METRICS.md` - Overview metrics migration
- Future: `retrieve_overview_data.py`, `retrieve_performance_data.py` migrations

## Notes
- Neo4j still used for **graph creation** (create_graph.py, delete_graph.py) - not affected
- Both old and new functions can coexist during transition period
- Consider adding `@deprecated` decorators to old functions once new ones are validated
