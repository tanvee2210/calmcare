import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status

from app.api.auth import get_current_user
from app.models.schemas import UserResponse, CaregiverInvite, CaregiverResponse, CaregiverConsentUpdate
from app.models.database import get_db_connection, log_audit_event

router = APIRouter(prefix="/api/caregivers", tags=["Caregiver Access & Consent"])

@router.post("/invite", response_model=CaregiverResponse)
def invite_caregiver(req: CaregiverInvite, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 11: Patient and caregiver mode.
    Patient grants explicit, revocable consent to a trusted family member.
    """
    conn = get_db_connection()
    c_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    caregiver_email = req.caregiver_email.strip().lower()

    with conn:
        conn.execute(
            """INSERT INTO caregiver_shares (id, patient_id, caregiver_email, caregiver_name, permissions, status, created_at)
               VALUES (?, ?, ?, ?, ?, 'active', ?)""",
            (c_id, current_user.id, caregiver_email, req.caregiver_name.strip(), json.dumps(req.permissions), now)
        )
    conn.close()

    log_audit_event(current_user.id, "caregiver_invited", {
        "caregiver_email": caregiver_email,
        "permissions": req.permissions
    })

    return CaregiverResponse(
        id=c_id,
        patient_id=current_user.id,
        caregiver_email=caregiver_email,
        caregiver_name=req.caregiver_name.strip(),
        permissions=req.permissions,
        status="active",
        created_at=now
    )

@router.get("/list", response_model=List[CaregiverResponse])
def list_caregivers(current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM caregiver_shares WHERE patient_id = ? ORDER BY created_at DESC",
        (current_user.id,)
    ).fetchall()
    conn.close()

    res = []
    for r in rows:
        res.append(CaregiverResponse(
            id=r["id"],
            patient_id=r["patient_id"],
            caregiver_email=r["caregiver_email"],
            caregiver_name=r["caregiver_name"],
            permissions=json.loads(r["permissions"]),
            status=r["status"],
            created_at=r["created_at"]
        ))
    return res

@router.put("/{share_id}/status", response_model=CaregiverResponse)
def update_caregiver_status(
    share_id: str,
    update: CaregiverConsentUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Allows patient to revoke consent at any time.
    """
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM caregiver_shares WHERE id = ? AND patient_id = ?",
        (share_id, current_user.id)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Caregiver share record not found.")

    with conn:
        conn.execute(
            "UPDATE caregiver_shares SET status = ? WHERE id = ?",
            (update.status, share_id)
        )
    conn.close()

    log_audit_event(current_user.id, "caregiver_status_updated", {
        "share_id": share_id,
        "new_status": update.status
    })

    return CaregiverResponse(
        id=row["id"],
        patient_id=current_user.id,
        caregiver_email=row["caregiver_email"],
        caregiver_name=row["caregiver_name"],
        permissions=json.loads(row["permissions"]),
        status=update.status,
        created_at=row["created_at"]
    )

@router.post("/accept-invite/{share_id}")
def accept_invite(share_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Accept a caregiver invitation if current user email matches caregiver_email."""
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM caregiver_shares WHERE id = ?", (share_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Invitation not found.")
    
    if row["caregiver_email"].lower() != current_user.email.lower():
        conn.close()
        raise HTTPException(status_code=403, detail="Email mismatch. You cannot accept this invitation.")
    
    with conn:
        conn.execute("UPDATE caregiver_shares SET status = 'active' WHERE id = ?", (share_id,))
    conn.close()
    return {"status": "success", "message": "Caregiver invitation accepted"}

@router.get("/shared-with-me")
def list_shared_patients(current_user: UserResponse = Depends(get_current_user)):
    """List all patients who have granted active consent to the current user as caregiver."""
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT cs.id as share_id, cs.patient_id, cs.permissions, cs.status, cs.created_at,
                  u.name as patient_name, u.email as patient_email
           FROM caregiver_shares cs
           JOIN users u ON cs.patient_id = u.id
           WHERE LOWER(cs.caregiver_email) = LOWER(?) AND cs.status = 'active'
           ORDER BY cs.created_at DESC""",
        (current_user.email,)
    ).fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "share_id": r["share_id"],
            "patient_id": r["patient_id"],
            "patient_name": r["patient_name"],
            "patient_email": r["patient_email"],
            "permissions": json.loads(r["permissions"]),
            "status": r["status"],
            "created_at": r["created_at"]
        })
    return result

@router.get("/patient-plan/{patient_id}")
def get_patient_plan_for_caregiver(patient_id: str, current_user: UserResponse = Depends(get_current_user)):
    """Verify active caregiver consent before returning patient's care plan."""
    conn = get_db_connection()
    share = conn.execute(
        """SELECT permissions, status FROM caregiver_shares 
           WHERE patient_id = ? AND LOWER(caregiver_email) = LOWER(?) AND status = 'active'""",
        (patient_id, current_user.email)
    ).fetchone()

    if not share:
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied. No active caregiver consent from this patient.")

    perms = json.loads(share["permissions"])
    if "view_plan" not in perms and "read_only" not in perms and "manage_reminders" not in perms:
        conn.close()
        raise HTTPException(status_code=403, detail="Access denied. Permission does not allow viewing care plan.")

    plan_row = conn.execute(
        "SELECT plan_data_json FROM care_plans WHERE user_id = ? ORDER BY version DESC LIMIT 1",
        (patient_id,)
    ).fetchone()

    reminders = conn.execute(
        "SELECT * FROM reminders WHERE user_id = ? AND status = 'active'",
        (patient_id,)
    ).fetchall()
    conn.close()

    if not plan_row:
        raise HTTPException(status_code=404, detail="No care plan found for this patient.")

    plan_data = json.loads(plan_row["plan_data_json"])
    reminder_list = [dict(r) for r in reminders]
    return {
        "care_plan": plan_data,
        "reminders": reminder_list,
        "permissions": perms
    }

