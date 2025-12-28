# PostgreSQL File Mapping Reference

## SWOT Data Retrieval Files

This document clarifies the relationship between Neo4j and PostgreSQL versions of SWOT data files.

### File Naming Conventions

There are TWO sets of file names for the same functionality (historical naming differences):

| Neo4j Version (OLD) | PostgreSQL Version (NEW) | Status |
|---------------------|--------------------------|--------|
| `retrieve_swot_data.py` | `retrieve_swot_data_pg.py` | ✅ Primary implementation |
| `retrieve_swot_data_cumulative.py` | `retrieve_swot_data_cumulative_pg.py` | ✅ Primary implementation |
| `topic_swot.py` | `topic_swot_pg.py` | ✅ Wrapper (imports from retrieve_swot_data_pg.py) |
| `topic_swot_cumulative.py` | `topic_swot_cumulative_pg.py` | ✅ Wrapper (imports from retrieve_swot_data_cumulative_pg.py) |

### Primary Implementation Files (Use These!)

**1. retrieve_swot_data_cumulative_pg.py** (600+ lines)
- **Purpose**: Cumulative SWOT analysis across ALL tests
- **Location**: `backend/exam/graph_utils/retrieve_swot_data_cumulative_pg.py`
- **Key Functions**:
  ```python
  fetch_topic_scores_pg(student_id, class_id)
  fetch_correct_questions_pg(student_id, class_id, subject, topics)
  fetch_wrong_questions_pg(student_id, class_id, subject, topics)
  best_topics_pg(student_id, class_id)
  most_challenging_topics_pg(student_id, class_id)
  rapid_learning_pg(student_id, class_id)
  ```

**2. retrieve_swot_data_pg.py** (550+ lines)
- **Purpose**: Single-test SWOT analysis
- **Location**: `backend/exam/graph_utils/retrieve_swot_data_pg.py`
- **Key Functions**:
  ```python
  fetch_topic_scores_analysis_pg(student_id, class_id, test_num)
  fetch_correct_questions_analysis_pg(student_id, class_id, test_num, subject, topics)
  fetch_wrong_questions_analysis_pg(student_id, class_id, test_num, subject, topics)
  best_topic_analysis_pg(student_id, class_id, test_num)
  most_challenging_topic_analysis_pg(student_id, class_id, test_num)
  rapid_learning_analysis_pg(student_id, class_id, test_num)
  strongest_question_type_analysis_pg(student_id, class_id, test_num)
  weakest_question_type_analysis_pg(student_id, class_id, test_num)
  ```

### Wrapper Files (Compatibility Layer)

**3. topic_swot_cumulative_pg.py** (wrapper)
- **Purpose**: Naming compatibility for legacy code
- **Location**: `backend/exam/graph_utils/topic_swot_cumulative_pg.py`
- **What it does**: Simply imports and re-exports functions from `retrieve_swot_data_cumulative_pg.py`
- **Use case**: If you have code that imports from `topic_swot_cumulative`, you can change to `topic_swot_cumulative_pg` without rewriting imports

**4. topic_swot_pg.py** (wrapper)
- **Purpose**: Naming compatibility for legacy code
- **Location**: `backend/exam/graph_utils/topic_swot_pg.py`
- **What it does**: Simply imports and re-exports functions from `retrieve_swot_data_pg.py`
- **Use case**: If you have code that imports from `topic_swot`, you can change to `topic_swot_pg` without rewriting imports

## Active Usage (Currently in Production)

### swot_generator.py - ACTIVE FUNCTIONS ✅

**Cumulative SWOT** (`generate_all_test_swot_with_AI`):
```python
from exam.graph_utils.retrieve_swot_data_cumulative_pg import (
    best_topics_pg, 
    most_challenging_topics_pg, 
    rapid_learning_pg
)

def generate_all_test_swot_with_AI(student_id, class_id):
    results = {
        "TS_BPT": best_topics_pg(student_id, class_id),
        "TW_MCT": most_challenging_topics_pg(student_id, class_id),
        "TO_RLT": rapid_learning_pg(student_id, class_id),
    }
```

**Single-Test SWOT** (`generate_swot_data_with_AI`):
```python
from exam.graph_utils.retrieve_swot_data_pg import (
    best_topic_analysis_pg,
    most_challenging_topic_analysis_pg,
    rapid_learning_analysis_pg
)

def generate_swot_data_with_AI(student_id, class_id, test_num):
    results = {
        "best_topic": best_topic_analysis_pg(student_id, class_id, test_num),
        "most_challenging_topic": most_challenging_topic_analysis_pg(student_id, class_id, test_num),
        "rapid_learning_topic": rapid_learning_analysis_pg(student_id, class_id, test_num),
    }
```

### update_dashboard.py - CALLER ✅

```python
# Cumulative SWOT - NO db_name needed!
overall_swot = generate_all_test_swot_with_AI(student_id, class_id)

# Test-specific SWOT - NO db_name needed!
test_wise_swot = generate_swot_data_with_AI(student_id, class_id, test_num)
```

## Legacy Functions (NOT IN USE) ⚠️

These functions still exist in `swot_generator.py` but are **NOT called** anywhere:

**Legacy Function 1**: `generate_swot_data(db_name, test_num)` 
- Imports from: `exam.graph_utils.topic_swot` (Neo4j version)
- Uses: `KnowledgeGraphManager`
- Status: ❌ Not called, kept for reference only

**Legacy Function 2**: `generate_all_test_swot(db_name)`
- Imports from: `exam.graph_utils.topic_swot_cumulative` (Neo4j version)
- Uses: `KnowledgeGraphManager`
- Status: ❌ Not called, kept for reference only

## Migration Summary

| Aspect | Before (Neo4j) | After (PostgreSQL) |
|--------|---------------|-------------------|
| **File Names** | `topic_swot.py`, `retrieve_swot_data.py` | `retrieve_swot_data_pg.py` (primary) |
| **Parameters** | `kg_manager` (Neo4j connection) | `student_id, class_id, test_num` |
| **Database** | Neo4j graph queries | PostgreSQL table queries (Django ORM) |
| **Connection** | Requires Neo4j setup/teardown | Django ORM handles it automatically |
| **Query Language** | Cypher | Django ORM / SQL |
| **Data Source** | Graph nodes/relationships | StudentResult, QuestionAnalysis, StudentResponse tables |

## Quick Reference: Which File to Use?

### For NEW Code:
✅ **Use**: `retrieve_swot_data_pg.py` and `retrieve_swot_data_cumulative_pg.py`
- These are the PRIMARY implementations
- Well-documented, comprehensive
- Use PostgreSQL directly

### For LEGACY Code Migration:
✅ **Option 1**: Update imports to use `retrieve_swot_data_pg`
✅ **Option 2**: Change `topic_swot` → `topic_swot_pg` (uses wrapper)

### For READING Old Code:
📖 If you see imports from:
- `topic_swot` → Old Neo4j version (single test)
- `topic_swot_cumulative` → Old Neo4j version (cumulative)
- `retrieve_swot_data` → Old Neo4j version (single test)
- `retrieve_swot_data_cumulative` → Old Neo4j version (cumulative)

👉 These should be replaced with `_pg` versions!

## Function Signature Changes

### Before (Neo4j):
```python
def best_topics(kg_manager):
    # Uses Neo4j
    query = "MATCH (s:Student)..."
    records = kg_manager.run_query(query)
```

### After (PostgreSQL):
```python
def best_topics_pg(student_id, class_id):
    # Uses PostgreSQL
    results = StudentResult.objects.filter(
        student_id=student_id,
        class_id=class_id
    )...
```

## Key Takeaway

**For all new SWOT-related code:**
1. Import from `retrieve_swot_data_pg.py` or `retrieve_swot_data_cumulative_pg.py`
2. Pass `student_id`, `class_id` (and `test_num` for single-test functions)
3. Do NOT use `db_name` or `kg_manager`
4. PostgreSQL tables used: `StudentResult`, `QuestionAnalysis`, `StudentResponse`

---

**Last Updated**: December 27, 2025  
**Migration Status**: ✅ Complete - All active functions using PostgreSQL
