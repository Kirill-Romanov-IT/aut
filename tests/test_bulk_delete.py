import requests
import json

BASE_URL = "http://localhost:8000"

def get_token():
    response = requests.post(f"{BASE_URL}/token", data={"username": "testuser", "password": "password"})
    return response.json()["access_token"]

def test_bulk_delete():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, let's see what we have
    response = requests.get(f"{BASE_URL}/companies", headers=headers)
    companies = response.json()
    print(f"Initial companies: {len(companies)}")
    
    if len(companies) < 2:
        print("Not enough companies to test bulk delete. Please upload some first.")
        return

    ids_to_delete = [companies[0]["id"], companies[1]["id"]]
    print(f"Deleting IDs: {ids_to_delete}")
    
    response = requests.post(f"{BASE_URL}/companies/bulk-delete", headers=headers, json=ids_to_delete)
    print(f"Delete response: {response.status_code}, {response.json()}")
    
    # Verify
    response = requests.get(f"{BASE_URL}/companies", headers=headers)
    companies_after = response.json()
    print(f"After companies: {len(companies_after)}")
    
    if len(companies_after) == len(companies) - 2:
        print("Bulk delete TEST PASSED")
    else:
        print("Bulk delete TEST FAILED")

if __name__ == "__main__":
    try:
        test_bulk_delete()
    except Exception as e:
        print(f"Error: {e}")
