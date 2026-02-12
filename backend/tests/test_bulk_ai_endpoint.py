from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

# Patch db.init_db BEFORE creating TestClient to avoid startup connection
with patch("db.init_db"):
    client = TestClient(app)

# Mock user dependency to bypass auth
async def mock_get_current_user():
    return {"id": 1, "username": "testuser"}

from main import get_current_user
app.dependency_overrides[get_current_user] = mock_get_current_user

@patch("ai_service.estimate_headcount_bulk")
def test_estimate_headcount_bulk_success(mock_estimate_bulk):
    # Mock the return value of the service
    mock_estimate_bulk.return_value = [
        {
            "id": "1",
            "headcount": {"value": 150, "min": 100, "max": 200},
            "confidence": 0.9,
            "source_hint": "LinkedIn"
        },
        {
            "id": "2",
            "headcount": {"value": 50, "min": 40, "max": 60},
            "confidence": 0.8,
            "source_hint": "Website"
        }
    ]

    response = client.post(
        "/companies/ai-bulk-estimate-headcount",
        json={"companies": [
            {"id": "1", "name": "Company A", "location": "Loc A"},
            {"id": "2", "name": "Company B", "location": "Loc B"}
        ]}
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == "1"
    assert data[0]["headcount"]["value"] == 150
    assert data[1]["id"] == "2"
    assert data[1]["headcount"]["value"] == 50
    
    # Verify service was called with correct data
    mock_estimate_bulk.assert_called_once()
    args = mock_estimate_bulk.call_args[0][0]
    assert len(args) == 2
    assert args[0]["name"] == "Company A"

@patch("ai_service.estimate_headcount_bulk")
def test_estimate_headcount_bulk_error(mock_estimate_bulk):
    # Mock an error
    mock_estimate_bulk.side_effect = Exception("Gemini bulk error")

    response = client.post(
        "/companies/ai-bulk-estimate-headcount",
        json={"companies": [{"id": "1", "name": "A", "location": "B"}]}
    )

    assert response.status_code == 500
    assert "Gemini bulk error" in response.json()["detail"]
