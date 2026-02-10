import pytest
from models import UserCreate, User
def test_user_create_missing_fields():
    with pytest.raises(ValueError):
        UserCreate(username="testuser")  # Missing email and password
