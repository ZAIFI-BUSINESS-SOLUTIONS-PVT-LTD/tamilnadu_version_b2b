from neo4j import GraphDatabase
from neo4j.exceptions import DriverError, ServiceUnavailable, TransientError
from dotenv import load_dotenv
import os
import time
import logging

load_dotenv()  # Load env vars from .env file
logger = logging.getLogger(__name__)

class KnowledgeGraphManager:
    def __init__(self, database_name, create_if_missing=False):
        self.uri = os.getenv("NEO4J_URI")
        self.username = os.getenv("NEO4J_USERNAME")
        self.password = os.getenv("NEO4J_PASSWORD")
        self.database_name = database_name.lower()
        self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))

        if create_if_missing:
            with self.driver.session(database="system") as session:
                result = session.run("SHOW DATABASES")
                db_names = [record["name"] for record in result]
                if self.database_name not in db_names:
                    print(f"Database `{self.database_name}` not found. Creating it...")
                    session.run(f"CREATE DATABASE `{self.database_name}`")
                    time.sleep(2)

    def get_session(self):
        try:
            return self.driver.session(database=self.database_name)
        except DriverError:
            # Driver was closed or unusable; recreate and return a new session.
            self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))
            return self.driver.session(database=self.database_name)

    def close(self):
        self.driver.close()

    def check_db(self):
        with self.driver.session(database="system") as session:
            result = session.run("SHOW DATABASES")
            db_names = [record["name"] for record in result]
            return self.database_name in db_names

    def delete_db(self):
        with self.driver.session(database="system") as session:
            session.run(f"DROP DATABASE `{self.database_name}` IF EXISTS")

    def run_query(self, query, **params):
        """
        Run a query with automatic retry logic for transient failures.
        
        Args:
            query: Cypher query string
            **params: Query parameters
        
        Returns:
            list: Query results as list of dicts
        """
        max_attempts = 3
        delay = 1
        last_exception = None
        
        for attempt in range(1, max_attempts + 1):
            try:
                with self.driver.session(database=self.database_name) as session:
                    result = session.run(query, **params)
                    return [record.data() for record in result]
            except (ServiceUnavailable, TransientError, DriverError) as e:
                last_exception = e
                logger.warning(
                    f"⚠️ Neo4j query failed (attempt {attempt}/{max_attempts}) on db '{self.database_name}': {e}"
                )
                
                if attempt < max_attempts:
                    logger.info(f"🔄 Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                    
                    # Try to recreate driver on connection errors
                    try:
                        self.driver.close()
                        self.driver = GraphDatabase.driver(self.uri, auth=(self.username, self.password))
                    except Exception as driver_error:
                        logger.error(f"❌ Failed to recreate driver: {driver_error}")
                else:
                    logger.error(
                        f"❌ Neo4j query failed after {max_attempts} attempts on db '{self.database_name}': {last_exception}"
                    )
            except Exception as e:
                # Non-retryable errors
                logger.error(f"❌ Neo4j query error (non-retryable) on db '{self.database_name}': {e}")
                raise
        
        # If all retries failed, return empty list instead of raising
        logger.warning(f"⚠️ Returning empty result after failed retries for db '{self.database_name}'")
        return []
