import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.db import get_db_connection, init_db
from backend import models

client = TestClient(app)

# Helper to clear tables
def clear_tables():
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE companies RESTART IDENTITY CASCADE")
        # Ensure mappings exist (they are seeded in init_db, but we can check or re-seed if truncated, 
        # but TRUNCATE companies won't affect mappings if they are separate. 
        # Let's just truncate companies.)
    conn.commit()
    conn.close()

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db() # Ensure tables exist
    clear_tables()
    yield
    clear_tables()

# Mock auth dependency
# In a real app we might override the dependency. 
# For now, let's assume we can bypass or mock it.
# Since main.py uses `get_current_user`, we should override it.

async def mock_get_current_user():
    return models.User(id=1, username="testuser", email="test@example.com", is_active=True)

# app.dependency_overrides[app.router.dependencies[0].dependency] = mock_get_current_user
# Only if it's a global dependency or we find where it is used.
# actually `upload_companies` uses `Depends(get_current_user)`.
# We need to override THAT specific dependency.
from backend.main import get_current_user
app.dependency_overrides[get_current_user] = mock_get_current_user

def test_upload_companies_success():
    csv_content = """Company Name,Employees,Location,Limit
Test Corp,100,New York,1000
Another Inc,50,London,500"""
    
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/companies/upload", files=files)
    
    assert response.status_code == 201
    assert "Successfully imported 2 companies" in response.json()["message"]
    
    # Verify in DB via GET
    response = client.get("/companies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Sort by created_at DESC, but if same time, order is unstable.
    # Check existence instead.
    names = [c["name"] for c in data]
    assert "Test Corp" in names
    assert "Another Inc" in names

def test_upload_companies_mapping():
    # Test valid synonyms
    csv_content = """Organization,Staff Count,City
Mapped Corp,200,Berlin"""
    
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/companies/upload", files=files)
    
    assert response.status_code == 201
    
    response = client.get("/companies")
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Mapped Corp"
    assert data[0]["employees"] == 200
    assert data[0]["location"] == "Berlin"

def test_upload_companies_ignore_extras():
    csv_content = """Company Name,Unknown Column,Employees
Extra Corp,Some Data,300"""
    
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/companies/upload", files=files)
    
    assert response.status_code == 201
    
    response = client.get("/companies")
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Extra Corp"
    assert data[0]["employees"] == 300
    # No error occurred

def test_upload_invalid_file():
    files = {"file": ("test.txt", "some content", "text/plain")}
    response = client.post("/companies/upload", files=files)
    assert response.status_code == 400
