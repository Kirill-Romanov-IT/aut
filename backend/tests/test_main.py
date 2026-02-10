from fastapi.testclient import TestClient
import io
import db
import pytest
from main import app

client = TestClient(app)

@pytest.fixture
def auth_token():
    # Register and login to get a token
    username = "testuser_main"
    email = "test_main@example.com"
    password = "password123"
    
    # Cleanup if exists
    conn = db.get_db_connection()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM users WHERE username = %s", (username,))
        conn.commit()
    conn.close()

    client.post("/register", json={"username": username, "email": email, "password": password})
    response = client.post("/token", data={"username": username, "password": password})
    return response.json()["access_token"]

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from FastAPI"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}



