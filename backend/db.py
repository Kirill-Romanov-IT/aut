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
            conn.commit()
    finally:
        conn.close()
