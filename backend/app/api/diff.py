import json
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends

from app.api.auth import get_current_user
from app.models.schemas import UserResponse, VersionDiffResponse, CarePlan
from app.models.database import get_db_connection

router = APIRouter(prefix="/api/diff", tags=["Change Management & Version Comparison"])

@router.get("/compare", response_model=VersionDiffResponse)
def compare_care_plan_versions(
    old_plan_id: str,
    new_plan_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Features 27 & 31: Discharge-instruction change management and impact analyser.
    Compares two care plan versions, detects additions/removals/dose modifications,
    and identifies which active reminders or appointments need updating.
    """
    conn = get_db_connection()
    old_row = conn.execute("SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?", (old_plan_id, current_user.id)).fetchone()
    new_row = conn.execute("SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?", (new_plan_id, current_user.id)).fetchone()
    conn.close()

    if not old_row or not new_row:
        raise HTTPException(status_code=404, detail="One or both care plan versions not found.")

    old_plan = CarePlan(**json.loads(old_row["plan_data_json"]))
    new_plan = CarePlan(**json.loads(new_row["plan_data_json"]))

    med_changes = []
    old_meds = {m.name.lower(): m for m in old_plan.medicines}
    new_meds = {m.name.lower(): m for m in new_plan.medicines}

    affected_reminders = []
    review_actions = []

    # Check for modified or removed medicines
    for name, old_m in old_meds.items():
        if name in new_meds:
            new_m = new_meds[name]
            if old_m.dose != new_m.dose or old_m.frequency != new_m.frequency:
                med_changes.append({
                    "medicine": old_m.name,
                    "change_type": "modified",
                    "old_value": f"{old_m.dose} {old_m.unit} ({old_m.frequency})",
                    "new_value": f"{new_m.dose} {new_m.unit} ({new_m.frequency})"
                })
                affected_reminders.append(f"Reminder for {old_m.name}: Dosage/frequency changed. Pause until patient confirms.")
                review_actions.append(f"Confirm updated dose for {old_m.name}.")
        else:
            med_changes.append({
                "medicine": old_m.name,
                "change_type": "discontinued_or_removed",
                "old_value": f"{old_m.dose} {old_m.unit}",
                "new_value": "Not in new summary"
            })
            affected_reminders.append(f"Reminder for {old_m.name}: Medicine not listed in new summary. Review before retiring.")
            review_actions.append(f"Verify if {old_m.name} was deliberately stopped.")

    # Check for newly added medicines
    for name, new_m in new_meds.items():
        if name not in old_meds:
            med_changes.append({
                "medicine": new_m.name,
                "change_type": "newly_prescribed",
                "old_value": "None",
                "new_value": f"{new_m.dose} {new_m.unit} ({new_m.frequency})"
            })
            review_actions.append(f"Add new reminder for newly prescribed {new_m.name}.")

    # Date differences
    date_changes = []
    old_dates = [f.date for f in old_plan.follow_ups if f.date]
    new_dates = [f.date for f in new_plan.follow_ups if f.date]
    if old_dates != new_dates:
        date_changes.append({
            "field": "Follow-up Appointment Date",
            "old_date": old_dates[0] if old_dates else "None",
            "new_date": new_dates[0] if new_dates else "None"
        })
        affected_reminders.append("Hospital follow-up appointment date updated in new summary.")
        review_actions.append("Update calendar reminder with new follow-up date.")

    return VersionDiffResponse(
        old_plan_id=old_plan_id,
        new_plan_id=new_plan_id,
        medicine_changes=med_changes,
        date_changes=date_changes,
        affected_active_reminders=affected_reminders,
        required_review_actions=review_actions
    )
