import pytest
from app.services.medical_extractor import medical_extractor
from app.services.verification_engine import verification_engine
from app.models.schemas import CarePlan, VerificationStatus

CONFLICT_SUMMARY = """
HOSPITAL DISCHARGE NOTE - CONFLICT TEST CASE
PATIENT: Kishore Gopal | AGE: 61Y / M

SECTION 1 - CLINICAL ORDERS:
Tab. Amlodipine 5 mg PO Once Daily in morning.

SECTION 4 - DISCHARGE PRESCRIPTION:
Tab. Amlodipine 50 mg PO Once Daily in morning.
Tab. Torsemide 10 mg OD.

FOLLOW-UP:
Cardio-Nephro clinic on 15/10/2026.
"""

def test_internal_contradiction_is_detected():
    extraction = medical_extractor.extract_structured_facts(CONFLICT_SUMMARY)
    assert len(extraction.detected_conflicts) >= 1
    assert any("5 mg vs 50 mg" in c or "conflicting doses" in c for c in extraction.detected_conflicts)

    plan = CarePlan(
        id="conflict-plan",
        document_id=extraction.document_id,
        user_id="test-user",
        version=1,
        created_at="2026-10-17T00:00:00Z",
        language="en",
        verification_status=VerificationStatus.READY_FOR_VALIDATION,
        condition_category=extraction.condition_category,
        patient_summary="Plan with conflict",
        plain_diagnosis=extraction.primary_diagnosis,
        medicines=extraction.medicines,
        warning_signs=extraction.warning_signs,
        follow_ups=extraction.follow_ups,
        instructions=extraction.instructions,
        questions_for_doctor=[],
        readability_score=7.8,
        readability_level_label="Class 7-8",
        verification_summary={}
    )

    report = verification_engine.verify_care_plan(extraction, plan)
    assert report.can_be_labelled_verified is False
    assert report.status == VerificationStatus.FAIL_CRITICAL_CONFLICT
