import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_user_registration_and_login():
    unique_id = str(uuid.uuid4())[:8]
    email = f"patient_{unique_id}@test.com"
    reg_payload = {
        "name": "Ananya Sen",
        "email": email,
        "password": "Password123!Secure",
        "role": "patient",
        "preferred_language": "hi",
        "accessibility_mode": False
    }

    # 1. Register
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == email

    # 2. Duplicate registration rejected
    dup_res = client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Login with valid credentials
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!Secure"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # 4. Access protected /me route
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 5. Invalid password fails
    bad_login = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword999!"
    })
    assert bad_login.status_code == 401

    # 6. Logout and verify session revocation
    logout_res = client.post("/api/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # 7. Accessing protected route with revoked token is rejected
    revoked_res = client.get("/api/auth/me", headers=headers)
    assert revoked_res.status_code == 401
