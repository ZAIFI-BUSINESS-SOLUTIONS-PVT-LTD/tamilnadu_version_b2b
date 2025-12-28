"""
PostgreSQL-based SWOT data retrieval for single tests.
This is a compatibility wrapper that imports from retrieve_swot_data_pg.py

IMPORTANT: This file exists for naming compatibility only.
The actual implementation is in retrieve_swot_data_pg.py
Use that file directly for new code.
"""

# Import all functions from the main PostgreSQL implementation
from exam.graph_utils.retrieve_swot_data_pg import (
    # Helper calculation functions
    calculate_weighted_score,
    
    # Data fetching functions
    fetch_topic_scores_analysis_pg as fetch_topic_scores,
    fetch_correct_questions_analysis_pg as fetch_correct_questions,
    fetch_wrong_questions_analysis_pg as fetch_wrong_questions,
    fetch_all_questions_analysis_pg as fetch_all_questions,
    fetch_question_type_scores_analysis_pg as fetch_question_type_scores,
    fetch_wrong_questions_by_qtype_analysis_pg as fetch_wrong_questions_by_qtype,
    fetch_correct_questions_by_qtype_analysis_pg as fetch_correct_questions_by_qtype,
    
    # Analysis functions (single test)
    best_topic_analysis_pg as best_topic_analysis,
    most_challenging_topic_analysis_pg as most_challenging_topic_analysis,
    rapid_learning_analysis_pg as rapid_learning_analysis,
    strongest_question_type_analysis_pg as strongest_question_type_analysis,
    weakest_question_type_analysis_pg as weakest_question_type_analysis,
)

__all__ = [
    'calculate_weighted_score',
    'fetch_topic_scores',
    'fetch_correct_questions',
    'fetch_wrong_questions',
    'fetch_all_questions',
    'fetch_question_type_scores',
    'fetch_wrong_questions_by_qtype',
    'fetch_correct_questions_by_qtype',
    'best_topic_analysis',
    'most_challenging_topic_analysis',
    'rapid_learning_analysis',
    'strongest_question_type_analysis',
    'weakest_question_type_analysis',
]

# Note: All functions use PostgreSQL (student_id, class_id, test_num)
# They do NOT use Neo4j (kg_manager)
