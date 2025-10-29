from neo4j import GraphDatabase
from dotenv import load_dotenv
import os
import time

load_dotenv()  # Load env vars from .env file

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
        with self.driver.session(database=self.database_name) as session:
            result = session.run(query, **params)
            return [record.data() for record in result]
