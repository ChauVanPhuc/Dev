import sys
import os
sys.path.append(os.path.abspath('BackEnd'))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.get("/api/v1/screens/1104")
print("Status Code:", response.status_code)
if response.status_code == 200:
    data = response.json()
    print("Screen Code:", data.get("current_code"))
    bugs = data.get("bugs", [])
    print(f"Number of bugs in JSON response: {len(bugs)}")
    for bug in bugs:
        print(f"  Bug ID: {bug.get('id')} | Description: {bug.get('description')} | Status: {bug.get('status')}")
