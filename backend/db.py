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
            
            # Create companies table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    employees INT DEFAULT 0,
                    location VARCHAR(255),
                    limit_val VARCHAR(255),
                    description TEXT,
                    status VARCHAR(50) DEFAULT 'new',
                    scheduled_at TIMESTAMP,
                    contact_name VARCHAR(255),
                    contact_surname VARCHAR(255),
                    contact_phone VARCHAR(255),
                    is_ready BOOLEAN DEFAULT FALSE,
                    is_in_kanban BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Create archived_companies table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS archived_companies (
                    id SERIAL PRIMARY KEY,
                    company_name VARCHAR(255) NOT NULL,
                    location VARCHAR(255),
                    name VARCHAR(255),
                    sur_name VARCHAR(255),
                    phone_number VARCHAR(255),
                    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Ensure columns exist for existing tables
            try:
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_surname VARCHAR(255);")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(255);")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT FALSE;")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_in_kanban BOOLEAN DEFAULT FALSE;")
                # Centralized workflow columns
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS workflow_bucket VARCHAR(10) DEFAULT 'ALL';")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS kanban_column VARCHAR(30) DEFAULT NULL;")
                cur.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;")
            except Exception:
                pass # Should not fail with IF NOT EXISTS, but being safe.

            # Backfill workflow_bucket from legacy boolean flags (idempotent)
            cur.execute("""
                UPDATE companies SET workflow_bucket = 'KANBAN', kanban_column = status
                WHERE is_in_kanban = TRUE AND workflow_bucket = 'ALL'
            """)
            cur.execute("""
                UPDATE companies SET workflow_bucket = 'READY'
                WHERE is_ready = TRUE AND is_in_kanban = FALSE AND workflow_bucket = 'ALL'
            """)

            # Activity log for tracking workflow transitions
            cur.execute("""
                CREATE TABLE IF NOT EXISTS activity_log (
                    id SERIAL PRIMARY KEY,
                    company_id INTEGER NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    old_value VARCHAR(255),
                    new_value VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Create company_column_mappings table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS company_column_mappings (
                    id SERIAL PRIMARY KEY,
                    csv_header VARCHAR(255) UNIQUE NOT NULL,
                    db_field VARCHAR(255) NOT NULL
                );
            """)
            
            # Seed default mappings
            # We use ON CONFLICT DO NOTHING to add new defaults without overwriting or duplicating
            default_mappings = [
                ('Company Name', 'name'),
                ('Organization', 'name'),
                ('Name', 'name'),
                ('Number of Employees', 'employees'),
                ('Employees', 'employees'),
                ('Staff Count', 'employees'),
                ('Location', 'location'),
                ('City', 'location'),
                ('Address', 'location'),
                ('Limit', 'limit_val'),
                ('clients_company', 'name'),
                ('location_office', 'location'),
                ('previous_call_summary', 'description'), # Just in case they want this mapped to something, but we don't have description field yet?
                # The companies table has: id, name, employees, location, limit_val, created_at.
                # Use only what we have.
            ]
            for header, field in default_mappings:
                    cur.execute(
                    "INSERT INTO company_column_mappings (csv_header, db_field) VALUES (%s, %s) ON CONFLICT (csv_header) DO NOTHING",
                    (header, field)
                )

            conn.commit()
    finally:
        conn.close()
