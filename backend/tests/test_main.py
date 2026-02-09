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

def test_upload_csv(auth_token):
    csv_content = (
        "phone_number,user_name,user_surname,clients_company,position,agent_name,location_office,direct_extension,previous_call_summary\n"
        "+14155552671,John,Mitchell,BlueStone Construction,Project Manager,Alex Carter,San Francisco HQ,,Spoke briefly\n"
    )
    files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}
    response = client.post(
        "/upload-csv",
        files=files,
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert response.json() == {"message": "CSV uploaded and processed successfully"}

def test_get_clients(auth_token):
    response = client.get(
        "/clients",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    # Ensure our uploaded client is there
    clients = response.json()
    assert any(c["user_name"] == "John" for c in clients)
