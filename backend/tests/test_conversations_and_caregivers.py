import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

import uuid

def test_conversations_and_caregivers():
    # 1. Register a test user
    u_id = uuid.uuid4().hex[:6]
    email = f"conv_test_{u_id}@calmcare.in"
    client.post("/api/auth/register", json={
        "name": "Conversation User",
        "email": email,
        "password": "Password123!",
        "role": "patient",
        "preferred_language": "en"
    })
    login_resp = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload a sample document
    summary_text = """
    DISCHARGE SUMMARY
    PATIENT: Conversation User
    DIAGNOSIS: Acute Bronchitis
    MEDICATIONS:
    1. Azithromycin 500 mg once daily for 3 days
    2. Paracetamol 650 mg as needed for fever
    WARNING SIGNS: High fever > 102F or severe shortness of breath
    FOLLOW UP: Visit OPD on 2026-10-25 with Dr. Rao
    """
    upload_resp = client.post("/api/documents/upload", data={"raw_text_input": summary_text}, headers=headers)
    assert upload_resp.status_code == 200
    doc_id = upload_resp.json()["document_id"]

    # 3. Create a conversation
    conv_create = client.post("/api/assistant/conversations", json={
        "document_id": doc_id,
        "title": "Bronchitis Care Plan Q&A"
    }, headers=headers)
    assert conv_create.status_code == 200
    conv = conv_create.json()
    assert conv["title"] == "Bronchitis Care Plan Q&A"
    conv_id = conv["id"]

    # 4. List conversations
    conv_list = client.get("/api/assistant/conversations", headers=headers)
    assert conv_list.status_code == 200
    assert len(conv_list.json()) >= 1

    # 5. Send message in conversation
    msg_resp = client.post(f"/api/assistant/conversations/{conv_id}/messages", json={
        "text": "What is each of my medicines for?",
        "document_id": doc_id
    }, headers=headers)
    assert msg_resp.status_code == 200
    msg_data = msg_resp.json()
    assert "user_message" in msg_data
    assert "assistant_message" in msg_data
    assert "Azithromycin" in msg_data["assistant_message"]["text"]

    # 6. Retrieve conversation detail
    detail_resp = client.get(f"/api/assistant/conversations/{conv_id}", headers=headers)
    assert detail_resp.status_code == 200
    assert len(detail_resp.json()["messages"]) == 2

    # 7. Caregiver invite and shared-with-me check
    cg_email = f"caregiver_{u_id}@calmcare.in"
    invite_resp = client.post("/api/caregivers/invite", json={
        "caregiver_email": cg_email,
        "caregiver_name": "Partner Caregiver",
        "permissions": ["view_plan", "manage_reminders"]
    }, headers=headers)
    assert invite_resp.status_code == 200
    share_id = invite_resp.json()["id"]

    # Register and login caregiver
    client.post("/api/auth/register", json={
        "name": "Partner Caregiver",
        "email": cg_email,
        "password": "Password123!",
        "role": "caregiver",
        "preferred_language": "en"
    })
    cg_login = client.post("/api/auth/login", json={"email": cg_email, "password": "Password123!"})
    cg_token = cg_login.json()["access_token"]
    cg_headers = {"Authorization": f"Bearer {cg_token}"}

    # Caregiver checks shared-with-me
    shared_resp = client.get("/api/caregivers/shared-with-me", headers=cg_headers)
    assert shared_resp.status_code == 200
    assert len(shared_resp.json()) >= 1
    patient_id = shared_resp.json()[0]["patient_id"]

    # Caregiver views patient's care plan
    plan_resp = client.get(f"/api/caregivers/patient-plan/{patient_id}", headers=cg_headers)
    assert plan_resp.status_code == 200
    assert "care_plan" in plan_resp.json()
