import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def test_conn():
    try:
        url = os.environ.get("DATABASE_URL")
        print(f"Connecting to {url}")
        with psycopg.connect(url, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                print("Connection successful!")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_conn()
