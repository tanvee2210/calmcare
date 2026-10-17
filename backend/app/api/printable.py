import os
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, Response
from app.api.auth import get_current_user
from app.models.schemas import UserResponse, CarePlan
from app.models.database import get_db_connection
from app.services.pdf_report_service import pdf_report_service

router = APIRouter(prefix="/api/printable", tags=["Printable Outputs & Export"])

@router.get("/fridge-sheet/{plan_id}")
def download_fridge_sheet(plan_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 12: One-page fridge sheet PDF download.
    Generates high-contrast, clean printable PDF containing only verified essentials.
    """
    conn = get_db_connection()
    row = conn.execute(
        "SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?",
        (plan_id, current_user.id)
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Care plan not found.")

    plan = CarePlan(**json.loads(row["plan_data_json"]))
    pdf_path = pdf_report_service.generate_fridge_sheet(plan)

    return FileResponse(
        path=pdf_path,
        filename=f"CalmCare_Fridge_Sheet_{plan_id[:8]}.pdf",
        media_type="application/pdf"
    )

@router.get("/calendar-export/{plan_id}")
def export_calendar_ics(plan_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 17: Calendar export for documented follow-up appointments.
    Generates a standard .ics iCalendar file.
    """
    conn = get_db_connection()
    row = conn.execute(
        "SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?",
        (plan_id, current_user.id)
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Care plan not found.")

    plan = CarePlan(**json.loads(row["plan_data_json"]))
    
    if not plan.follow_ups or not plan.follow_ups[0].date:
        raise HTTPException(status_code=400, detail="No specific appointment date documented in this summary.")

    fu = plan.follow_ups[0]
    # Build standard RFC 5545 iCalendar content
    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CalmCare Healthcare Companion//EN",
        "BEGIN:VEVENT",
        f"SUMMARY:Hospital Follow-up: {fu.department or 'OPD'}",
        f"DESCRIPTION:Follow-up review with {fu.doctor or 'Doctor'}. Source note: {fu.source_passage}",
        f"LOCATION:{fu.location or 'Hospital OPD'}",
        f"STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    ics_content = "\r\n".join(ics_lines)

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=calmcare_appointment_{plan_id[:8]}.ics"}
    )
