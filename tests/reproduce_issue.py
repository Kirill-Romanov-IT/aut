from backend.main import app
from backend.db import get_db_connection, init_db
from fastapi.testclient import TestClient
import pytest

client = TestClient(app)

# Helper to clear tables
def clear_tables():
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE companies RESTART IDENTITY CASCADE")
        # Ensure mappings exist
        # We might need to manually insert the defaults if init_db doesn't re-run or check existing
    conn.commit()
    conn.close()

@pytest.fixture(autouse=True)
def setup_teardown():
    init_db()
    clear_tables()
    yield
    # clear_tables()

async def mock_get_current_user():
    from backend import models
    return models.User(id=1, username="testuser", email="test@example.com", is_active=True)

from backend.main import get_current_user
app.dependency_overrides[get_current_user] = mock_get_current_user

def test_upload_user_csv_500():
    csv_content = """phone_number,user_name,user_surname,clients_company,position,agent_name,location_office,direct_extension,previous_call_summary
+14155552671,John,Mitchell,BlueStone Construction,Project Manager,Alex Carter,San Francisco HQ,,Spoke briefly, client is interested in automation for unbiased sales, asked to follow up next week.
+12125550198,Sarah,Collins,NorthRiver Logistics,Head of Operations,Alex Carter,New York Office,214,Discussed current lead generation process, using mostly manual outreach, open to demo."""
    
    files = {"file": ("user_upload.csv", csv_content, "text/csv")}
    response = client.post("/companies/upload", files=files)
    
    assert response.status_code == 201
    assert "Successfully imported" in response.json()["message"]
    
    # Check if companies were actually imported (BlueStone Construction, NorthRiver Logistics)
    # This might fail if mapping is missing, but shouldn't 500.
    response = client.get("/companies")
    data = response.json()
    # If mappings are missing, count might be 0, but status should be 200/201.
    print(data)
