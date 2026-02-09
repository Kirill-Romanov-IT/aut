import os
import psycopg
from psycopg.rows import dict_row

def get_db_connection():
    conn = psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)
    return conn

def init_db():
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS clients (
                    id SERIAL PRIMARY KEY,
                    phone_number VARCHAR(50) NOT NULL,
                    user_name VARCHAR(100) NOT NULL,
                    user_surname VARCHAR(100) NOT NULL,
                    clients_company VARCHAR(255) NOT NULL,
                    position VARCHAR(100) NOT NULL,
                    agent_name VARCHAR(100) NOT NULL,
                    location_office VARCHAR(100) NOT NULL,
                    direct_extension VARCHAR(20),
                    previous_call_summary TEXT
                );
            """)
            conn.commit()
    finally:
        conn.close()
