import pytest

def test_user_registration_and_login(client):
    reg_data = {"username": "tester01", "password": "strongpassword123", "full_name": "Nguyen Van Test"}
    response = client.post("/accounts/", json=reg_data)
    assert response.status_code == 200

    login_data = {"username": "tester01", "password": "strongpassword123"}
    response = client.post("/accounts/login", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_login_failure_and_locking(client):
    client.post("/accounts/", json={"username": "locked_user", "password": "correct_pass", "full_name": "Locked"})
    for i in range(5):
        client.post("/accounts/login", data={"username": "locked_user", "password": "wrong_pass"})
    
    response = client.post("/accounts/login", data={"username": "locked_user", "password": "correct_pass"})
    assert response.status_code == 403
