from backend.db import get_db_connection

def check_db():
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM companies")
        rows = cur.fetchall()
        print(f"Total companies in DB: {len(rows)}")
        for row in rows:
            print(row)
    conn.close()

if __name__ == "__main__":
    check_db()
