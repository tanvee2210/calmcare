import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends

from app.api.auth import get_current_user
from app.models.schemas import (
    UserResponse, SevenDayTimetable, TimetableSlot,
    ReminderCreate, ReminderLogAction, DailyCheckInSubmit,
    CarePlan
)
from app.models.database import get_db_connection, log_audit_event

router = APIRouter(prefix="/api/reminders", tags=["Timetable & Recovery Reminders"])

@router.get("/timetable/{plan_id}", response_model=SevenDayTimetable)
def get_medicine_timetable(plan_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 10: Visual medicine timetable.
    Maps medicines to time slots (Morning, Afternoon, Evening, Night) ONLY based on explicit
    documented frequencies and timings. Never invents exact clock times.
    """
    conn = get_db_connection()
    row = conn.execute("SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?", (plan_id, current_user.id)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Care plan not found.")

    plan = CarePlan(**json.loads(row["plan_data_json"]))

    morning_meds = []
    afternoon_meds = []
    evening_meds = []
    night_meds = []

    for med in plan.medicines:
        freq = med.frequency.lower()
        timing = (med.timing or "").lower()

        if "once daily at bedtime" in freq or "bedtime" in timing or "hs" in timing:
            night_meds.append(med)
        elif "once daily" in freq:
            if "lunch" in timing:
                afternoon_meds.append(med)
            elif "bedtime" in timing:
                night_meds.append(med)
            else:
                morning_meds.append(med)
        elif "twice daily" in freq:
            morning_meds.append(med)
            night_meds.append(med)
        elif "three times daily" in freq:
            morning_meds.append(med)
            afternoon_meds.append(med)
            night_meds.append(med)
        elif "sos" in freq:
            # As needed: label in notes
            pass
        else:
            morning_meds.append(med)

    slots = [
        TimetableSlot(
            slot_name="Morning (After Breakfast / As Stated)",
            time_guidance="Take with or after morning meal unless specified 'before breakfast'",
            medicines=morning_meds
        ),
        TimetableSlot(
            slot_name="Afternoon (Lunch)",
            time_guidance="Take during or after midday meal",
            medicines=afternoon_meds
        ),
        TimetableSlot(
            slot_name="Evening (Dinner / Night)",
            time_guidance="Take after evening meal",
            medicines=evening_meds
        ),
        TimetableSlot(
            slot_name="Bedtime (Before Sleep)",
            time_guidance="Take right before retiring to bed with plain water",
            medicines=night_meds
        )
    ]

    notes = [
        "Slots are based strictly on documented frequencies (e.g. Once Daily, Twice Daily).",
        "Exact clock times should be chosen according to your family routine and confirmed with your doctor.",
        "SOS medications are taken only when symptoms occur (e.g. fever or pain)."
    ]

    return SevenDayTimetable(care_plan_id=plan_id, slots=slots, notes=notes)

@router.post("/create")
def create_reminder(req: ReminderCreate, current_user: UserResponse = Depends(get_current_user)):
    rem_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    with conn:
        conn.execute(
            """INSERT INTO reminders (id, user_id, care_plan_id, medicine_name, dose, slot, preferred_time, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)""",
            (rem_id, current_user.id, "active_plan", req.medicine_name, req.dose, req.reminder_slot, req.user_preferred_time, now)
        )
    conn.close()

    log_audit_event(current_user.id, "reminder_created", {"medicine": req.medicine_name, "time": req.user_preferred_time})
    return {"id": rem_id, "message": "Reminder preference saved successfully."}

@router.get("/list")
def list_reminders(current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM reminders WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC",
        (current_user.id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/log-action")
def log_reminder_action(req: ReminderLogAction, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 18: Reminder reliability and missed-task handling.
    Tracks explicit user-confirmed actions. Never recommends double dosing if skipped.
    """
    log_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    with conn:
        conn.execute(
            "INSERT INTO reminder_logs (id, reminder_id, user_id, action, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?)",
            (log_id, req.reminder_id, current_user.id, req.action, now, req.notes)
        )
    conn.close()

    msg = f"Recorded action: {req.action}."
    if req.action == "skipped":
        msg += " Important Clinical Rule: Do NOT double your next dose. Continue normal schedule or check with doctor."

    return {"message": msg, "action": req.action}

@router.post("/check-in")
def submit_daily_checkin(req: DailyCheckInSubmit, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 22: Daily recovery check-in.
    If potentially urgent symptoms are reported, routes to urgent care guidance immediately.
    """
    urgent_keywords = ["chest pain", "breathlessness", "severe bleeding", "fever > 101", "blackout", "sugar < 70"]
    reported_urgent = any(any(kw in s.lower() for kw in urgent_keywords) for s in req.symptoms)

    urgent_guidance = None
    if reported_urgent:
        urgent_guidance = (
            "URGENT ATTENTION REQUIRED: One or more of your reported symptoms matches a documented emergency warning sign! "
            "Please go to your nearest hospital emergency room immediately or call 108 / 1066."
        )

    checkin_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    with conn:
        conn.execute(
            """INSERT INTO recovery_checkins (id, user_id, feeling_level, symptoms_json, urgent_flag, completed_meds, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (checkin_id, current_user.id, req.feeling_level, json.dumps(req.symptoms), int(reported_urgent), int(req.completed_meds), req.notes, now)
        )
    conn.close()

    log_audit_event(current_user.id, "recovery_checkin", {
        "feeling_level": req.feeling_level,
        "urgent_flag": reported_urgent
    })

    return {
        "id": checkin_id,
        "urgent_symptom_detected": reported_urgent,
        "urgent_guidance": urgent_guidance,
        "message": "Daily check-in recorded. Thank you for logging your recovery notes."
    }

@router.get("/check-in/history")
def get_checkin_history(current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 23: Personal recovery progress dashboard.
    Summarizes self-reported trends over time (clearly labeled self-reported, not clinical proof of cure).
    """
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM recovery_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT 14",
        (current_user.id,)
    ).fetchall()
    conn.close()

    history = []
    for r in rows:
        d = dict(r)
        d["symptoms"] = json.loads(d["symptoms_json"])
        history.append(d)

    return {
        "checkins": history,
        "disclaimer": "This progress log reflects your self-reported feelings and adherence. It is an organizational aid and does not constitute clinical certification of recovery."
    }
