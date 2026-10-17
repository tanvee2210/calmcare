import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.database import init_db

@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c

def test_full_recovery_flow_and_assistant(client):
    # 1. Register and login
    email = "recoverypatient@calmcare.in"
    client.post('/api/auth/register', json={
        'name': 'Ramesh Kumar',
        'email': email,
        'password': 'Password123!',
        'role': 'patient'
    })
    login_res = client.post('/api/auth/login', json={'email': email, 'password': 'Password123!'})
    assert login_res.status_code == 200
    token = login_res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Upload document
    raw_text = """APOLLO HOSPITALS - DISCHARGE SUMMARY
PATIENT NAME: Ramesh Kumar Sharma | AGE: 58Y / MALE
ADMISSION: 02/10/2026 | DISCHARGE: 06/10/2026

DIAGNOSIS:
Acute Coronary Syndrome (NSTEMI) - Post-PTCA with DES to proximal LAD.
Essential Hypertension. Dyslipidemia.

HOSPITAL COURSE:
Patient admitted with retrosternal chest pain radiating to left arm. Successful angioplasty stent. Hemodynamics stable.

DISCHARGE MEDICATIONS:
1. Tab. Ecosprin 75 mg - 1 tablet - Once daily (OD) - After lunch - Duration: Lifelong
2. Tab. Atorva 40 mg - 1 tablet - Once daily at bedtime (HS) - Duration: Ongoing
3. Tab. Sorbitrate 5 mg - 1 tablet Sublingual (SL) - SOS only if severe chest pain occurs

DIET & ACTIVITY INSTRUCTIONS:
- Low-salt diet (< 3g/day).
- No heavy weight lifting (> 5 kg) for 4 weeks.

WARNING SIGNS - RETURN TO EMERGENCY IMMEDIATELY IF:
- Recurrent severe chest pain radiating to jaw or left arm
- Shortness of breath at rest or profuse sweating

FOLLOW-UP APPOINTMENT:
- Visit Cardiology OPD on 20/10/2026 at 10:30 AM with Dr. V. Narayanan.
"""

    upload_res = client.post('/api/documents/upload', data={'raw_text_input': raw_text}, headers=headers)
    assert upload_res.status_code == 200
    doc_data = upload_res.json()
    plan_id = doc_data['care_plan_id']
    doc_id = doc_data['document_id']
    care_plan = doc_data['care_plan']

    # 3. Verify extracted features
    assert care_plan.get('admission_reason') is not None
    assert "retrosternal chest pain" in care_plan['admission_reason']
    assert len(care_plan.get('checklist') or []) >= 3

    # Check drug reference matching
    ecosprin = next(m for m in care_plan['medicines'] if 'Ecosprin' in m['name'])
    assert ecosprin.get('plain_purpose') is not None
    assert "clots" in ecosprin['plain_purpose']

    # 4. Verify Explain Again across all 5 user modes (Feature F)
    for mode in ['simpler', 'slower', 'language', 'audio', 'source']:
        res = client.post(f'/api/careplan/{plan_id}/explain-again?item_id=med-1&mode={mode}', headers=headers)
        assert res.status_code == 200
        explanation = res.json()
        assert 'simplified_explanation' in explanation
        assert explanation['mode'] == mode
        if mode == 'source':
            assert 'source_proof' in explanation

    # 5. Verify Assistant Q&A grounded answers (Feature B)
    # Question 1: Admission reason
    res1 = client.post('/api/assistant/ask', json={'document_id': doc_id, 'question': 'Why was I admitted to the hospital?'}, headers=headers)
    assert res1.status_code == 200
    assert "admitted" in res1.json()['answer'].lower() or "chest pain" in res1.json()['answer'].lower()
    assert res1.json().get('suggested_followups') is not None

    # Question 2: Medicines
    res2 = client.post('/api/assistant/ask', json={'document_id': doc_id, 'question': 'What is each of my medicines for?'}, headers=headers)
    assert res2.status_code == 200
    assert "Ecosprin" in res2.json()['answer']

    # Question 3: Restrictions
    res3 = client.post('/api/assistant/ask', json={'document_id': doc_id, 'question': 'What should I avoid doing?'}, headers=headers)
    assert res3.status_code == 200
    assert "lifting" in res3.json()['answer'].lower() or "low-salt" in res3.json()['answer'].lower()

    # Question 4: Follow up
    res4 = client.post('/api/assistant/ask', json={'document_id': doc_id, 'question': 'When is my next appointment?'}, headers=headers)
    assert res4.status_code == 200
    assert "20/10/2026" in res4.json()['answer'] or "Cardiology" in res4.json()['answer']

    # Question 5: Missed dose safety
    res5 = client.post('/api/assistant/ask', json={'document_id': doc_id, 'question': 'Should I double up on a missed dose?'}, headers=headers)
    assert res5.status_code == 200
    assert "never double" in res5.json()['answer'].lower()

    # 6. Verify Printable PDF Download (Feature G)
    pdf_res = client.get(f'/api/printable/fridge-sheet/{plan_id}', headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers['content-type'] == 'application/pdf'
    assert len(pdf_res.content) > 100

    # 7. Verify Calendar Export (.ics) (Feature H)
    ics_res = client.get(f'/api/printable/calendar-export/{plan_id}', headers=headers)
    assert ics_res.status_code == 200
    assert 'text/calendar' in ics_res.headers['content-type']
    assert 'BEGIN:VCALENDAR' in ics_res.text
    assert 'END:VCALENDAR' in ics_res.text
