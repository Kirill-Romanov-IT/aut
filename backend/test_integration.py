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

        # 3. Upload CSV
        print("Uploading CSV...")
        csv_content = (
            "phone_number,user_name,user_surname,clients_company,position,agent_name,location_office,direct_extension,previous_call_summary\n"
            "+14155552671,John,Mitchell,BlueStone Construction,Project Manager,Alex Carter,San Francisco HQ,,Spoke briefly, client is interested in automation for outbound sales\n"
        )
        files = {"file": ("test.csv", csv_content, "text/csv")}
        up_resp = client.post("/upload-csv", files=files, headers=headers)
        if up_resp.status_code != 200:
            print(f"Upload failed: {up_resp.status_code} - {up_resp.text}")
            return

        # 4. Get Clients
        print("Fetching clients...")
        clients_resp = client.get("/clients", headers=headers)
        print(f"Status: {clients_resp.status_code}")
        if clients_resp.status_code != 200:
            print(f"Error: {clients_resp.text}")
        else:
            data = clients_resp.json()
            print(f"Clients found: {len(data)}")
            if data:
                print(f"First client: {json.dumps(data[0], indent=2)}")

if __name__ == "__main__":
    run_test()
