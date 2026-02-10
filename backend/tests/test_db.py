import pytest
import db
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def test_get_db_connection():
    # This test expects the environment to have a valid DATABASE_URL
    conn = db.get_db_connection()
    assert conn is not None
    assert not conn.closed
    conn.close()

def test_init_db():
    # Test that init_db runs without errors and creates tables
    db.init_db()
    conn = db.get_db_connection()
    try:
        with conn.cursor() as cur:
            # Check if users table exists
            cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")
            result = cur.fetchone()
            assert list(result.values())[0] is True
            
    finally:
        conn.close()
