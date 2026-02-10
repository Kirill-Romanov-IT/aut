import httpx
import time
import json

BASE_URL = "http://localhost:8000"

def run_test():
    with httpx.Client(base_url=BASE_URL) as client:
        # 1. Register
        user_data = {
            "username": f"testuser_{int(time.time())}",
            "email": f"test_{int(time.time())}@example.com",
            "password": "password123"
        }
        print(f"Registering user: {user_data['username']}")
        reg_resp = client.post("/register", json=user_data)
        if reg_resp.status_code != 200:
            print(f"Registration failed: {reg_resp.status_code} - {reg_resp.text}")
            return

        # 2. Login
        print("Logging in...")
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        login_resp = client.post("/token", data=login_data)
        if login_resp.status_code != 200:
            print(f"Login failed: {login_resp.status_code} - {login_resp.text}")
            return
        
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Integration test passed for core auth flow.")

if __name__ == "__main__":
    run_test()
