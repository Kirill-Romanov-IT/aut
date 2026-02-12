from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Mock user dependency to bypass auth
async def mock_get_current_user():
    return {"id": 1, "username": "testuser"}

app.dependency_overrides[app.router.dependencies[0].dependency] = mock_get_current_user 
# Note: The dependency structure might be different, so let's try a simpler approach if this fails.
# Actually, the endpoints depend on `get_current_user`.
from main import get_current_user
app.dependency_overrides[get_current_user] = mock_get_current_user

@patch("ai_service.estimate_headcount")
def test_estimate_headcount_success(mock_estimate):
    # Mock the return value of the service
    mock_estimate.return_value = {
        "headcount": {"value": 150, "min": 100, "max": 200},
        "confidence": 0.9,
        "source_hint": "LinkedIn"
    }

    response = client.post(
        "/companies/ai-estimate-headcount",
        json={"prompt": "Test prompt"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["headcount"]["value"] == 150
    assert data["confidence"] == 0.9
    assert data["source_hint"] == "LinkedIn"
    mock_estimate.assert_called_once_with("Test prompt")

@patch("ai_service.estimate_headcount")
def test_estimate_headcount_error(mock_estimate):
    # Mock an error
    mock_estimate.side_effect = Exception("Gemini error")

    response = client.post(
        "/companies/ai-estimate-headcount",
        json={"prompt": "Test prompt"}
    )

    assert response.status_code == 500
    assert "Gemini error" in response.json()["detail"]
