# SWOT Data Architecture Change

## Before Migration (Neo4j)

```
┌─────────────────────────────────────────────────────────────────┐
│                    update_dashboard.py                          │
│  update_single_student_dashboard(student_id, class_id, ...)    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ generate_all_test_swot_with_AI(db_name)
                       │ generate_swot_data_with_AI(db_name, test_num)
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                     swot_generator.py                           │
│  - Imports from retrieve_swot_data_cumulative                   │
│  - Imports from retrieve_swot_data                              │
│  - Creates KnowledgeGraphManager(db_name)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ best_topics(kg_manager)
                       │ most_challenging_topics(kg_manager)
                       │ rapid_learning(kg_manager)
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│          retrieve_swot_data_cumulative.py (Neo4j)               │
│  def best_topics(kg_manager):                                   │
│    - Cypher query: MATCH (s:Student)-[r:ATTEMPTED]->(q:Question)│
│    - Graph traversal for topic scores                           │
│    - Returns DataFrame                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Neo4j Database                            │
│  Graph Structure:                                               │
│  (Student)-[:ATTEMPTED]->(Question)                             │
│  (Question)-[:BELONGS_TO]->(Topic)                              │
│  (Topic)-[:PART_OF]->(Subject)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## After Migration (PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────┐
│                    update_dashboard.py                          │
│  update_single_student_dashboard(student_id, class_id, ...)    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ generate_all_test_swot_with_AI(db_name, student_id, class_id)
                       │ generate_swot_data_with_AI(db_name, test_num, student_id, class_id)
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                     swot_generator.py                           │
│  - Imports from retrieve_swot_data_cumulative_pg                │
│  - Imports from retrieve_swot_data_pg                           │
│  - NO Neo4j connection needed                                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ best_topics_pg(student_id, class_id)
                       │ most_challenging_topics_pg(student_id, class_id)
                       │ rapid_learning_pg(student_id, class_id)
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│       retrieve_swot_data_cumulative_pg.py (PostgreSQL)          │
│  def best_topics_pg(student_id, class_id):                      │
│    - Django ORM query: StudentResult.objects.filter(...)        │
│    - .values('test_num', 'subject', 'topic')                    │
│    - .annotate(total=Count(), correct=Sum(...))                 │
│    - Returns DataFrame                                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                           │
│  Table: exam_studentresult                                      │
│    Columns: student_id, class_id, test_num, question_number,   │
│             subject, topic, chapter, is_correct                 │
│                                                                 │
│  Table: exam_questionanalysis                                   │
│    Columns: class_id, test_num, question_number, question_text,│
│             topic, subtopic, typeOfquestion, option_*_feedback  │
│                                                                 │
│  Table: exam_studentresponse                                    │
│    Columns: student_id, class_id, test_num, question_number,   │
│             selected_answer                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Connection Management
**Before**: 
```python
kg_manager = KnowledgeGraphManager(database_name=db_name)
try:
    result = best_topics(kg_manager)
finally:
    kg_manager.close()
```

**After**:
```python
result = best_topics_pg(student_id, class_id)
# No connection management needed - Django handles it
```

### 2. Query Syntax
**Before (Neo4j Cypher)**:
```cypher
MATCH (s:Student {student_id: $student_id})
      -[r:ATTEMPTED]->(q:Question)
      -[:BELONGS_TO]->(t:Topic)
      -[:PART_OF]->(sub:Subject)
WHERE r.is_correct = true
RETURN sub.name AS Subject, 
       t.name AS Topic,
       count(q) AS Total,
       sum(CASE WHEN r.is_correct THEN 1 ELSE 0 END) AS Correct
```

**After (Django ORM)**:
```python
StudentResult.objects.filter(
    student_id=student_id,
    class_id=class_id
).values('subject', 'topic').annotate(
    total=Count('question_number'),
    correct=Sum(Case(When(is_correct=True, then=1), default=0))
)
```

### 3. Data Flow
**Before**: Graph → Nodes/Edges → Pandas DataFrame → Analysis → Return  
**After**: SQL Table → Django QuerySet → Pandas DataFrame → Analysis → Return

### 4. Function Signatures
**Before**:
```python
def best_topics(kg_manager)
def best_topic_analysis(kg_manager, test_name)
```

**After**:
```python
def best_topics_pg(student_id, class_id)
def best_topic_analysis_pg(student_id, class_id, test_num)
```

## Performance Comparison

| Aspect | Neo4j (Before) | PostgreSQL (After) |
|--------|----------------|-------------------|
| Connection Setup | ~100-200ms | ~5-10ms (pooled) |
| Query Execution | Graph traversal (variable) | Indexed table scan (fast) |
| Result Parsing | Neo4j records → DataFrame | QuerySet → DataFrame |
| Scalability | Graph size dependent | Table size + indexes |
| Maintenance | Separate Neo4j instance | Unified PostgreSQL |

## Benefits of Migration

1. **Simplified Infrastructure**: No separate Neo4j server for reads
2. **Unified Database**: All data in PostgreSQL
3. **Faster Queries**: Indexed table scans vs graph traversal
4. **Easier Debugging**: Standard SQL vs Cypher
5. **Better Integration**: Django ORM throughout codebase
6. **Lower Latency**: No cross-database queries

## Neo4j Usage After Migration

Neo4j still used for:
- **Graph Creation**: `create_graph.py` - Build knowledge graph from ingested data
- **Graph Deletion**: `delete_graph.py` - Clean up student graphs
- **Write Operations**: Any graph structure modifications

Neo4j **NOT** used for:
- Reading student performance data
- Calculating metrics
- Generating SWOT analysis
- Dashboard data retrieval

## Migration Pattern (Repeatable)

This migration follows a repeatable pattern that can be applied to other modules:

1. **Identify**: Find Neo4j read function (takes `kg_manager`)
2. **Analyze**: Understand Cypher query and output format
3. **Translate**: Convert Cypher to Django ORM
4. **Preserve**: Keep exact output format (DataFrame structure, column names)
5. **Create**: New file with `_pg` suffix
6. **Update**: Change imports and function calls in consumers
7. **Test**: Validate output matches Neo4j version
8. **Document**: Create migration notes

**Already Migrated**:
- ✅ calculate_metrics.py → calculate_metrics_pg functions
- ✅ retrieve_swot_data_cumulative.py → retrieve_swot_data_cumulative_pg.py
- ✅ retrieve_swot_data.py → retrieve_swot_data_pg.py

**Remaining**:
- ⏳ retrieve_overview_data.py
- ⏳ retrieve_performance_data.py
- ⏳ Any other graph_utils read modules

## Backward Compatibility

Functions maintain backward compatibility:
```python
def generate_all_test_swot_with_AI(db_name, student_id=None, class_id=None):
    # If student_id/class_id not provided, extract from db_name
    if student_id is None or class_id is None:
        student = Student.objects.filter(neo4j_db__iexact=db_name).first()
        if student:
            student_id = student.student_id
            class_id = student.class_id
    
    # Proceed with PostgreSQL queries...
```

**Calling Options**:
1. **New way** (recommended): `generate_all_test_swot_with_AI(db_name, student_id, class_id)`
2. **Old way** (fallback): `generate_all_test_swot_with_AI(db_name)` - queries Student model

## Files Summary

```
backend/
├── exam/
│   ├── graph_utils/
│   │   ├── retrieve_swot_data_cumulative_pg.py    [NEW - 600+ lines]
│   │   ├── retrieve_swot_data_pg.py               [NEW - 550+ lines]
│   │   ├── retrieve_swot_data_cumulative.py       [OLD - still present for comparison]
│   │   └── retrieve_swot_data.py                  [OLD - still present for comparison]
│   ├── insight/
│   │   └── swot_generator.py                      [MODIFIED - updated imports & calls]
│   └── services/
│       └── update_dashboard.py                    [MODIFIED - pass student_id/class_id]
├── MIGRATION_NOTES_SWOT_DATA.md                   [NEW - detailed notes]
├── SWOT_MIGRATION_SUMMARY.md                      [NEW - high-level summary]
└── SWOT_ARCHITECTURE_CHANGE.md                    [NEW - this file]
```
