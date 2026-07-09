import pytest

def test_user_registration_and_login(client):
    reg_data = {
        "username": "tester01", 
        "password": "strongpassword123", 
        "full_name": "Nguyen Van Test",
        "phone": "0987654321"
    }
    response = client.post("/accounts/", json=reg_data)
    assert response.status_code == 200

    login_data = {"username": "tester01", "password": "strongpassword123"}
    response = client.post("/accounts/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_failure_and_locking(client):
    client.post("/accounts/", json={
        "username": "locked_user", 
        "password": "correct_pass", 
        "full_name": "Locked",
        "phone": "0987654322"
    })
    for i in range(5):
        client.post("/accounts/login", data={"username": "locked_user", "password": "wrong_pass"})
    
    response = client.post("/accounts/login", data={"username": "locked_user", "password": "correct_pass"})
    assert response.status_code == 403

def test_phone_is_required_and_unique(client):
    # Test phone missing -> validation error (422)
    reg_no_phone = {
        "username": "tester_no_phone", 
        "password": "password123", 
        "full_name": "No Phone"
    }
    response = client.post("/accounts/", json=reg_no_phone)
    assert response.status_code == 422

    # Test phone unique validation -> success for first, failure for second
    reg_user_1 = {
        "username": "tester_u1", 
        "password": "password123", 
        "full_name": "User One",
        "phone": "0900000001",
        "email": "user1@example.com"
    }
    response1 = client.post("/accounts/", json=reg_user_1)
    assert response1.status_code == 200

    reg_user_2 = {
        "username": "tester_u2", 
        "password": "password123", 
        "full_name": "User Two",
        "phone": "0900000001",  # Same phone
        "email": "user2@example.com"
    }
    response2 = client.post("/accounts/", json=reg_user_2)
    assert response2.status_code == 400
    assert "Số điện thoại đã được đăng ký" in response2.json()["detail"]

def test_email_can_be_null_and_duplicate(client):
    # Register user with null/no email
    reg_user_null_email_1 = {
        "username": "null_email_1", 
        "password": "password123", 
        "full_name": "Null Email 1",
        "phone": "0911111111",
        "email": None
    }
    response1 = client.post("/accounts/", json=reg_user_null_email_1)
    assert response1.status_code == 200

    reg_user_null_email_2 = {
        "username": "null_email_2", 
        "password": "password123", 
        "full_name": "Null Email 2",
        "phone": "0911111112",
        "email": None
    }
    response2 = client.post("/accounts/", json=reg_user_null_email_2)
    assert response2.status_code == 200  # Email can be null for multiple accounts

    # Register user with duplicate email
    reg_user_dup_email = {
        "username": "dup_email_user", 
        "password": "password123", 
        "full_name": "Dup Email User",
        "phone": "0911111113",
        "email": "user1@example.com"  # Same as tester_u1
    }
    response3 = client.post("/accounts/", json=reg_user_dup_email)
    assert response3.status_code == 200  # Duplicate email is allowed

def test_decoupled_permissions(client):
    # 1. Register a test user
    reg_user = {
        "username": "perm_tester",
        "password": "password123",
        "full_name": "Permission Tester",
        "phone": "0922222222",
        "email": "perm@example.com"
    }
    reg_res = client.post("/accounts/", json=reg_user)
    assert reg_res.status_code == 200
    user_id = reg_res.json()["id"]

    # 2. Update screen permissions to fine-grained decoupled values
    perm_payload = {
        "permissions": {
            "users": "read,edit",
            "screens": "none",
            "plan": "read,create,delete"
        }
    }
    put_res = client.put(f"/accounts/{user_id}/permissions", json=perm_payload)
    assert put_res.status_code == 200

    # 3. Retrieve resolved permissions and check if they are resolved as fine-grained actions
    get_res = client.get(f"/accounts/{user_id}/permissions?resolved=true")
    assert get_res.status_code == 200
    perms = get_res.json()["permissions"]
    assert perms["users"] == "read,edit"
    assert perms["screens"] == "none"
    assert perms["plan"] == "read,create,delete"

    # 4. Update screen permissions to legacy format to test backwards compatibility
    legacy_payload = {
        "permissions": {
            "users": "edit",
            "screens": "none"
        }
    }
    put_res2 = client.put(f"/accounts/{user_id}/permissions", json=legacy_payload)
    assert put_res2.status_code == 200

    # 5. Retrieve resolved permissions and verify it maps legacy "edit" to "read,create,edit"
    get_res2 = client.get(f"/accounts/{user_id}/permissions?resolved=true")
    assert get_res2.status_code == 200
    perms2 = get_res2.json()["permissions"]
    assert perms2["users"] == "read,create,edit"
    assert perms2["screens"] == "none"


