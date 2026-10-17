import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status

from app.api.auth import get_current_user
from app.models.schemas import (
    UserResponse, CarePlan, TranslationRequest, TranslationResult,
    VerificationStatus
)
from app.models.database import get_db_connection, log_audit_event
from app.services.translation_service import translation_service
from app.services.verification_engine import verification_engine
from app.services.medical_extractor import medical_extractor

router = APIRouter(prefix="/api/careplan", tags=["Care Plan & Explanations"])

@router.get("/{plan_id}", response_model=CarePlan)
def get_care_plan(plan_id: str, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?",
        (plan_id, current_user.id)
    ).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Care plan not found or access unauthorized.")

    return CarePlan(**json.loads(row["plan_data_json"]))

@router.post("/translate", response_model=TranslationResult)
def translate_plan(req: TranslationRequest, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT plan_data_json, document_id FROM care_plans WHERE id = ? AND user_id = ?",
        (req.care_plan_id, current_user.id)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Original care plan not found.")

    doc_id = row["document_id"]
    # Look up base English care plan for this document to prevent lossy chain translation
    base_en_row = conn.execute(
        "SELECT plan_data_json FROM care_plans WHERE document_id = ? AND user_id = ? AND language = 'en' ORDER BY version DESC LIMIT 1",
        (doc_id, current_user.id)
    ).fetchone()

    source_plan = CarePlan(**json.loads(base_en_row["plan_data_json"])) if base_en_row else CarePlan(**json.loads(row["plan_data_json"]))

    if req.target_language == "en":
        conn.close()
        return TranslationResult(
            language="en",
            care_plan=source_plan,
            cross_language_verification={"is_consistent": True, "notes": "Reverted cleanly to base verified English plan"}
        )

    # Run Translation from base English
    translated_plan = translation_service.translate_care_plan(source_plan, req.target_language)

    # Cross-language consistency check (Feature 32)
    consistency_rep = translation_service.verify_cross_language_consistency(source_plan, translated_plan)

    # Save translation variant in database
    now = datetime.now(timezone.utc).isoformat()
    with conn:
        conn.execute(
            """INSERT OR REPLACE INTO care_plans (id, document_id, user_id, version, language, verification_status, plan_data_json, readability_score, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (translated_plan.id, translated_plan.document_id, current_user.id, translated_plan.version, req.target_language,
             translated_plan.verification_status.value, json.dumps(translated_plan.model_dump()), translated_plan.readability_score, now)
        )
    conn.close()

    log_audit_event(current_user.id, "care_plan_translated", {
        "plan_id": req.care_plan_id,
        "target_language": req.target_language,
        "is_consistent": consistency_rep["is_consistent"]
    })

    return TranslationResult(
        language=req.target_language,
        care_plan=translated_plan,
        cross_language_verification=consistency_rep
    )

@router.post("/{plan_id}/explain-again")
def explain_again(
    plan_id: str,
    item_id: str,
    mode: str = "simpler", # "simpler", "slower", "audio", "source"
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Feature 26: Explain This Again.
    Allows asking for a second explanation of any individual instruction without restarting.
    Preserves exact clinical values while providing gentler phrasing.
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

    # Find the target item
    target_med = next((m for m in plan.medicines if m.id == item_id), None)
    target_warn = next((w for w in plan.warning_signs if w.id == item_id), None)
    target_inst = next((i for i in plan.instructions if i.id == item_id), None)
    target_fu = next((f for f in plan.follow_ups if f.id == item_id), None)

    target_med = next((m for m in plan.medicines if m.id == item_id), None)
    target_warn = next((w for w in plan.warning_signs if w.id == item_id), None)
    target_inst = next((i for i in plan.instructions if i.id == item_id), None)
    target_fu = next((f for f in plan.follow_ups if f.id == item_id), None)

    if target_med:
        purpose_str = f" This medicine {target_med.plain_purpose}." if target_med.plain_purpose else ""
        if mode == "source":
            text = f"Original line in discharge summary: \"{target_med.source_passage}\""
        elif mode == "slower":
            text = f"Take your medicine... {target_med.name}... {target_med.dose} {target_med.unit}... {target_med.frequency}."
        elif mode == "language":
            text = f"{target_med.name}: {target_med.dose} {target_med.unit}, {target_med.frequency}. {target_med.timing or ''}"
        elif mode == "audio":
            text = f"Your medicine is {target_med.name}. Take {target_med.dose} {target_med.unit}, {target_med.frequency}. {target_med.timing or ''}."
        else: # simpler
            text = (
                f"You need to take {target_med.name}. The exact dose is {target_med.dose} {target_med.unit}, "
                f"{target_med.frequency.lower()}. {target_med.timing or 'Take with water.'}{purpose_str} "
                f"Please do not stop or change this dose without asking your doctor."
            )
        return {
            "item_id": item_id,
            "item_name": target_med.name,
            "prescribed_dose": f"{target_med.dose} {target_med.unit}",
            "mode": mode,
            "simplified_explanation": text,
            "source_proof": target_med.source_passage,
            "pacing_hint": "Speak at 0.70x speed with 1.5s pause after dosage."
        }

    if target_warn:
        if mode == "source":
            text = f"Original warning in summary: \"{target_warn.source_passage}\""
        elif mode == "slower":
            text = f"Warning sign to watch for... {target_warn.sign}... Action needed: {target_warn.action_required}."
        else:
            text = (
                f"Warning Sign: If you notice {target_warn.sign.lower()} ({target_warn.plain_meaning.lower()}), "
                f"this is a documented alert to {target_warn.action_required.lower()}."
            )
        return {
            "item_id": item_id,
            "item_name": target_warn.sign,
            "mode": mode,
            "simplified_explanation": text,
            "source_proof": target_warn.source_passage,
            "pacing_hint": "Speak at 0.70x speed clearly and calmly."
        }

    if target_inst:
        if mode == "source":
            text = f"Original instruction in summary: \"{target_inst.source_passage}\""
        elif mode == "slower":
            text = f"Home recovery instruction... {target_inst.plain_language_explanation}."
        else:
            text = f"Home Care Instruction: {target_inst.plain_language_explanation}. Follow this to help your recovery."
        return {
            "item_id": item_id,
            "item_name": target_inst.category.title(),
            "mode": mode,
            "simplified_explanation": text,
            "source_proof": target_inst.source_passage,
            "pacing_hint": "Speak at 0.75x speed."
        }

    if target_fu:
        loc = f" at {target_fu.department}" if target_fu.department else ""
        doc = f" with {target_fu.doctor}" if target_fu.doctor else ""
        date_str = target_fu.date or "as instructed"
        if mode == "source":
            text = f"Original appointment entry: \"{target_fu.source_passage}\""
        else:
            text = f"Next Appointment: Please visit the clinic on {date_str}{loc}{doc}. Keep this date marked on your calendar."
        return {
            "item_id": item_id,
            "item_name": "Follow-Up Visit",
            "mode": mode,
            "simplified_explanation": text,
            "source_proof": target_fu.source_passage,
            "pacing_hint": "Speak at 0.80x speed."
        }

    return {
        "item_id": item_id,
        "mode": mode,
        "simplified_explanation": "Please follow the exact documented instructions on your care plan.",
        "source_proof": "Discharge summary document"
    }

@router.put("/{plan_id}/correct-field")
def correct_extracted_field(
    plan_id: str,
    field_type: str, # "medicine", "follow_up", "warning"
    field_id: str,
    corrected_data: Dict[str, Any],
    correction_reason: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Step 4: Extraction review & correction.
    Allows user or healthcare reviewer to correct an OCR inaccuracy.
    Preserves audit history and automatically re-runs independent verification engine.
    """
    conn = get_db_connection()
    row = conn.execute(
        "SELECT plan_data_json, document_id FROM care_plans WHERE id = ? AND user_id = ?",
        (plan_id, current_user.id)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Care plan not found.")

    plan = CarePlan(**json.loads(row["plan_data_json"]))

    # Update field
    if field_type == "medicine":
        for med in plan.medicines:
            if med.id == field_id:
                if "dose" in corrected_data:
                    med.dose = str(corrected_data["dose"])
                if "unit" in corrected_data:
                    med.unit = str(corrected_data["unit"])
                if "frequency" in corrected_data:
                    med.frequency = str(corrected_data["frequency"])
                med.review_status = "confirmed"
                med.is_critical_flag = False
                med.flag_reason = f"Confirmed/Corrected by user: {correction_reason}"

    # Get document raw text for re-verification
    doc_row = conn.execute("SELECT raw_text FROM documents WHERE id = ?", (row["document_id"],)).fetchone()
    extraction = medical_extractor.extract_structured_facts(doc_row["raw_text"], row["document_id"])
    
    # Re-run verification engine
    report = verification_engine.verify_care_plan(extraction, plan)
    plan.verification_status = report.status
    plan.verification_summary = report.model_dump()

    # Save updated plan
    with conn:
        conn.execute(
            "UPDATE care_plans SET plan_data_json = ?, verification_status = ? WHERE id = ?",
            (json.dumps(plan.model_dump()), report.status.value, plan_id)
        )
    conn.close()

    log_audit_event(current_user.id, "field_corrected", {
        "plan_id": plan_id,
        "field_type": field_type,
        "field_id": field_id,
        "reason": correction_reason,
        "new_status": report.status.value
    })

    return {
        "message": "Field corrected and re-verified successfully.",
        "care_plan": plan,
        "verification_report": report
    }
