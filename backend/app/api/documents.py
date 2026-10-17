import os
import uuid
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status

from app.api.auth import get_current_user
from app.models.schemas import (
    UserResponse, StructuredExtraction, CarePlan, VerificationStatus,
    VerificationReport
)
from app.models.database import get_db_connection, log_audit_event
from app.services.ocr_service import ocr_service
from app.services.medical_extractor import medical_extractor
from app.services.verification_engine import verification_engine
from app.services.glossary_service import glossary_service
from app.config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES

router = APIRouter(prefix="/api/documents", tags=["Documents & Extraction"])

@router.post("/upload")
async def upload_document(
    file: Optional[UploadFile] = File(None),
    raw_text_input: Optional[str] = Form(None),
    filename_override: Optional[str] = Form(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Step 2 & 3: File validation, OCR, structured extraction and initial care plan generation.
    Supports PDF/JPG/PNG files as well as direct synthetic text for instant validation.
    """
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    raw_text = ""
    file_type = "text/plain"
    file_size = 0
    filename = filename_override or "discharge_summary.txt"
    ocr_confidence = 1.0

    if file:
        filename = filename_override or file.filename or "uploaded_document"
        file_content = await file.read()
        file_size = len(file_content)

        if file_size > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size ({MAX_FILE_SIZE_BYTES // (1024*1024)} MB)."
            )

        file_type = file.content_type or "application/octet-stream"
        saved_path = os.path.join(str(UPLOAD_DIR), f"{doc_id}_{filename}")
        with open(saved_path, "wb") as f:
            f.write(file_content)

        # Run OCR / text extraction
        ocr_result = ocr_service.extract_text_from_file(saved_path, file_type)
        raw_text = ocr_result["raw_text"]
        ocr_confidence = ocr_result["overall_confidence"]

    elif raw_text_input:
        raw_text = raw_text_input
        file_size = len(raw_text_input.encode("utf-8"))
        saved_path = os.path.join(str(UPLOAD_DIR), f"{doc_id}_{filename}")
        with open(saved_path, "w", encoding="utf-8") as f:
            f.write(raw_text)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid document file or text input."
        )

    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded document could not be read or contains no readable text."
        )

    # Run Structured Medical Extraction
    extraction = medical_extractor.extract_structured_facts(raw_text, document_id=doc_id)

    # Calculate readability
    readability = glossary_service.calculate_readability(raw_text)

    # Initial Care Plan
    plan_id = str(uuid.uuid4())
    initial_plan = CarePlan(
        id=plan_id,
        document_id=doc_id,
        user_id=current_user.id,
        version=1,
        created_at=now,
        language="en",
        verification_status=VerificationStatus.READY_FOR_VALIDATION,
        condition_category=extraction.condition_category,
        patient_summary=f"Care plan for {extraction.patient_name or 'the patient'} diagnosed with {extraction.primary_diagnosis}.",
        plain_diagnosis=glossary_service.explain_clinical_term(extraction.primary_diagnosis) or extraction.primary_diagnosis,
        admission_reason=extraction.admission_reason,
        hospital_course=extraction.hospital_course,
        checklist=extraction.checklist,
        medicines=extraction.medicines,
        warning_signs=extraction.warning_signs,
        follow_ups=extraction.follow_ups,
        instructions=extraction.instructions,
        questions_for_doctor=[
            "When can I resume driving or physical activity?",
            "What should I do if I experience nausea from my medications?",
            "When should I get routine blood work repeated?"
        ],
        readability_score=readability["flesch_kincaid_grade"],
        readability_level_label=readability["grade_label"],
        verification_summary={}
    )

    # Independent Medical Verification
    verification_rep = verification_engine.verify_care_plan(extraction, initial_plan)
    initial_plan.verification_status = verification_rep.status
    initial_plan.verification_summary = verification_rep.model_dump()

    # Save to Database
    conn = get_db_connection()
    with conn:
        conn.execute(
            """INSERT INTO documents (id, user_id, filename, file_type, file_size, raw_text, status, ocr_confidence, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc_id, current_user.id, filename, file_type, file_size, raw_text, verification_rep.status.value, ocr_confidence, now)
        )
        conn.execute(
            """INSERT INTO care_plans (id, document_id, user_id, version, language, verification_status, plan_data_json, readability_score, created_at)
               VALUES (?, ?, ?, 1, 'en', ?, ?, ?, ?)""",
            (plan_id, doc_id, current_user.id, verification_rep.status.value, json.dumps(initial_plan.model_dump()), readability["flesch_kincaid_grade"], now)
        )
    conn.close()

    log_audit_event(current_user.id, "document_uploaded", {
        "document_id": doc_id,
        "filename": filename,
        "verification_status": verification_rep.status.value
    })

    return {
        "document_id": doc_id,
        "care_plan_id": plan_id,
        "filename": filename,
        "extraction": extraction,
        "care_plan": initial_plan,
        "verification_report": verification_rep
    }

@router.get("/list")
def list_documents(current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT id, filename, file_type, file_size, status, ocr_confidence, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC",
        (current_user.id,)
    ).fetchall()
    conn.close()

    return [dict(r) for r in rows]

@router.get("/{doc_id}")
def get_document(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT * FROM documents WHERE id = ? AND user_id = ?",
        (doc_id, current_user.id)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found or access denied.")

    plan_row = conn.execute(
        "SELECT id, plan_data_json FROM care_plans WHERE document_id = ? ORDER BY version DESC LIMIT 1",
        (doc_id,)
    ).fetchone()
    conn.close()

    plan_data = json.loads(plan_row["plan_data_json"]) if plan_row else None

    return {
        "document": dict(row),
        "active_care_plan": plan_data
    }

@router.delete("/{doc_id}")
def delete_document(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    row = conn.execute(
        "SELECT id FROM documents WHERE id = ? AND user_id = ?",
        (doc_id, current_user.id)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found.")

    with conn:
        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.close()

    log_audit_event(current_user.id, "document_deleted", {"document_id": doc_id})
    return {"message": "Document and associated care plans permanently deleted as requested."}
