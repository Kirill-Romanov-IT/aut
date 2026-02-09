import pytest
from fastapi.testclient import TestClient
from main import app
import db

client = TestClient(app)

# Helper to clear DB before tests (simplified for this context)
# In a real app, use a separate test DB or transaction rollback
@pytest.fixture(autouse=True)
def setup_db():
    db.init_db()  # Ensure table exists
    conn = db.get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE username LIKE 'testuser%'")
        conn.commit()
    conn.close()
    yield

def test_register_user():
    response = client.post(
        "/register",
        json={"username": "testuser_reg", "email": "test_reg@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser_reg"
    assert data["email"] == "test_reg@example.com"
    assert "id" in data
    assert "password" not in data

def test_login_user():
    # First register
    client.post(
        "/register",
        json={"username": "testuser_login", "email": "test_login@example.com", "password": "password123"},
    )
    
    # Then login
    response = client.post(
        "/token",
        data={"username": "testuser_login", "password": "password123"},
        headers={"content-type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_read_users_me():
    # Register
    client.post(
        "/register",
        json={"username": "testuser_me", "email": "test_me@example.com", "password": "password123"},
    )
    
    # Login
    login_response = client.post(
        "/token",
        data={"username": "testuser_me", "password": "password123"},
        headers={"content-type": "application/x-www-form-urlencoded"}
    )
    token = login_response.json()["access_token"]
    
    # Get me
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser_me"
    assert data["email"] == "test_me@example.com"
