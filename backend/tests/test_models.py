import pytest
from models import UserCreate, User, Client

def test_user_create_valid():
    data = {"username": "testuser", "email": "test@example.com", "password": "password123"}
    user = UserCreate(**data)
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.password == "password123"

def test_user_valid():
    data = {"id": 1, "username": "testuser", "email": "test@example.com", "is_active": True}
    user = User(**data)
    assert user.id == 1
    assert user.username == "testuser"
    assert user.is_active is True

def test_client_valid():
    data = {
        "phone_number": "123456789",
        "user_name": "John",
        "user_surname": "Doe",
        "clients_company": "ACME",
        "position": "Manager",
        "agent_name": "Agent Smith",
        "location_office": "NY",
    }
    client = Client(**data)
    assert client.user_name == "John"
    assert client.direct_extension is None

def test_client_extra_fields():
    # Test that extra fields are ignored as per Config.extra = "ignore"
    data = {
        "phone_number": "123456789",
        "user_name": "John",
        "user_surname": "Doe",
        "clients_company": "ACME",
        "position": "Manager",
        "agent_name": "Agent Smith",
        "location_office": "NY",
        "extra_field": "should be ignored"
    }
    client = Client(**data)
    assert not hasattr(client, "extra_field")

def test_user_create_missing_fields():
    with pytest.raises(ValueError):
        UserCreate(username="testuser")  # Missing email and password
