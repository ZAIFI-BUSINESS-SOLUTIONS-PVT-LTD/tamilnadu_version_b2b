"""
PostgreSQL-based SWOT data retrieval for cumulative analysis (all tests).
This is a compatibility wrapper that imports from retrieve_swot_data_cumulative_pg.py

IMPORTANT: This file exists for naming compatibility only.
The actual implementation is in retrieve_swot_data_cumulative_pg.py
Use that file directly for new code.
"""

# Import all functions from the main PostgreSQL implementation
from exam.graph_utils.retrieve_swot_data_cumulative_pg import (
    # Helper calculation functions
    calculate_weighted_score,
    calculate_improvement_rate,
    
    # Data fetching functions
    fetch_topic_scores_pg as fetch_topic_scores,
    fetch_correct_questions_pg as fetch_correct_questions,
    fetch_wrong_questions_pg as fetch_wrong_questions,
    fetch_all_questions_pg as fetch_all_questions,
    fetch_question_type_scores_pg as fetch_question_type_scores,
    fetch_wrong_questions_by_qtype_pg as fetch_wrong_questions_by_qtype,
    fetch_correct_questions_by_qtype_pg as fetch_correct_questions_by_qtype,
    
    # Analysis functions (cumulative across all tests)
    best_topics_pg as best_topics,
    most_challenging_topics_pg as most_challenging_topics,
    rapid_learning_pg as rapid_learning,
)

__all__ = [
    'calculate_weighted_score',
    'calculate_improvement_rate',
    'fetch_topic_scores',
    'fetch_correct_questions',
    'fetch_wrong_questions',
    'fetch_all_questions',
    'fetch_question_type_scores',
    'fetch_wrong_questions_by_qtype',
    'fetch_correct_questions_by_qtype',
    'best_topics',
    'most_challenging_topics',
    'rapid_learning',
]

# Note: All functions use PostgreSQL (student_id, class_id)
# They do NOT use Neo4j (kg_manager)
