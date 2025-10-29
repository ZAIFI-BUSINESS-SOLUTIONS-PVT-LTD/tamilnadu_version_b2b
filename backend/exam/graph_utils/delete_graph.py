from exam.graph_utils.knowledge_graph_manager import KnowledgeGraphManager
import logging

logger = logging.getLogger(__name__)

def delete_test_graph(db_name, test_num):
    """
    Deletes all nodes and relationships for a given test from a specific Neo4j database
    after verifying that the database exists.
    """
    test_name = f"Test{test_num}"
    kg_manager = KnowledgeGraphManager(database_name=db_name)

    # ✅ Check if database exists
    if not kg_manager.check_db():
        logger.warning(f"[ABORTED] Database '{db_name}' does not exist.")
        #print(f"[ABORTED] Database '{db_name}' does not exist.")
        kg_manager.close()
        return
    
    logger.info(f"[INFO] Database '{db_name}' found. Deleting all nodes for {test_name}...")
    #print(f"[INFO] Database '{db_name}' found. Deleting all nodes for {test_name}...")

    query = """
MATCH (test:Test {name: $test_name})
OPTIONAL MATCH (test)-[*]->(n)
DETACH DELETE test, n
    """

    kg_manager.run_query(query, test_name=test_name)
    logger.info(f"[SUCCESS] Deleted knowledge graph data for {test_name} from '{db_name}'")
    #print(f"[SUCCESS] Deleted knowledge graph data for {test_name} from '{db_name}'")
    kg_manager.close()


def delete_db(db_name):
    """
    Deletes all nodes and relationships for a given test from a specific Neo4j database
    after verifying that the database exists.
    """
    kg_manager = KnowledgeGraphManager(database_name=db_name)

    # ✅ Check if database exists
    if kg_manager.check_db():
        logger.info(f"[INFO] Dropping database '{db_name}'...")
        #print(f"[INFO] Dropping database '{db_name}'...")
        kg_manager.delete_db()
        kg_manager.close()
        return
