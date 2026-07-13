import requests

# Let's get the list of bugs first
res = requests.get("http://localhost:8000/api/v1/screen-bugs")
bugs = res.json()
print("Initial bugs count:", len(bugs))

# Find bug with ID 2092 or any test bug
test_bug = None
for bug in bugs:
    if bug["id"] == 2092:
        test_bug = bug
        break

if not test_bug:
    # Use the first bug in the list
    test_bug = bugs[0]

print("Testing with Bug ID:", test_bug["id"])

# Make PUT request to update it
payload = {
    "description": test_bug["description"] + " (UPDATED BY SCRIPT)",
    "severity": test_bug["severity"],
    "status": test_bug["status"],
    "assignee": test_bug["assignee"] or "Phucv1",
    "notes": "Test note",
    "requested_at": test_bug["requested_at"],
    "completed_at": test_bug["completed_at"],
    "updater": "TestScript"
}

put_res = requests.put(f"http://localhost:8000/api/v1/screen-bugs/{test_bug['id']}", json=payload)
print("PUT response status:", put_res.status_code)

# Get the list again to see if count changed
res2 = requests.get("http://localhost:8000/api/v1/screen-bugs")
bugs2 = res2.json()
print("Final bugs count:", len(bugs2))
