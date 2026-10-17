import pytest
from app.services.medical_extractor import medical_extractor
from app.services.verification_engine import verification_engine
from app.models.schemas import CarePlan, MedicineItem, VerificationStatus

SAMPLE_DISCHARGE = """
APOLLO HOSPITALS - DISCHARGE SUMMARY
PATIENT: Suresh Menon | AGE: 55Y / M
DIAGNOSIS: Essential Hypertension

DISCHARGE MEDICATIONS:
1. Tab. Telma (Telmisartan) 40 mg - 1 tablet - Once daily (OD) - Morning - Duration: Ongoing
2. Tab. Amlong (Amlodipine) 5 mg - 1 tablet - Once daily (OD) - Morning - Duration: Ongoing

FOLLOW-UP APPOINTMENT:
- Review on 25/10/2026 at 10:00 AM with Dr. Ramanathan.
"""

def test_accurate_care_plan_passes():
    extraction = medical_extractor.extract_structured_facts(SAMPLE_DISCHARGE)
    plan = CarePlan(
        id="test-plan-1",
        document_id=extraction.document_id,
        user_id="test-user",
        version=1,
        created_at="2026-10-17T00:00:00Z",
        language="en",
        verification_status=VerificationStatus.READY_FOR_VALIDATION,
        condition_category=extraction.condition_category,
        patient_summary="Patient recovery plan",
        plain_diagnosis=extraction.primary_diagnosis,
        medicines=extraction.medicines,
        warning_signs=extraction.warning_signs,
        follow_ups=extraction.follow_ups,
        instructions=extraction.instructions,
        questions_for_doctor=[],
        readability_score=7.5,
        readability_level_label="Class 7-8",
        verification_summary={}
    )
    report = verification_engine.verify_care_plan(extraction, plan)
    assert report.can_be_labelled_verified is True
    assert report.status == VerificationStatus.VERIFIED_AGAINST_SOURCE
    assert report.failed_critical_checks == 0

def test_altered_dose_triggers_hard_stop():
    extraction = medical_extractor.extract_structured_facts(SAMPLE_DISCHARGE)
    
    # Tamper with dose: change 5 mg to 50 mg
    tampered_meds = []
    for m in extraction.medicines:
        if "amlong" in m.name.lower() or "amlodipine" in m.name.lower():
            tampered_meds.append(MedicineItem(
                id=m.id, name=m.name, source_name=m.source_name, dose="50", unit=m.unit,
                frequency=m.frequency, timing=m.timing, duration=m.duration,
                source_passage=m.source_passage
            ))
        else:
            tampered_meds.append(m)

    plan = CarePlan(
        id="test-plan-tampered",
        document_id=extraction.document_id,
        user_id="test-user",
        version=1,
        created_at="2026-10-17T00:00:00Z",
        language="en",
        verification_status=VerificationStatus.READY_FOR_VALIDATION,
        condition_category=extraction.condition_category,
        patient_summary="Tampered plan",
        plain_diagnosis=extraction.primary_diagnosis,
        medicines=tampered_meds,
        warning_signs=extraction.warning_signs,
        follow_ups=extraction.follow_ups,
        instructions=extraction.instructions,
        questions_for_doctor=[],
        readability_score=7.5,
        readability_level_label="Class 7-8",
        verification_summary={}
    )
    report = verification_engine.verify_care_plan(extraction, plan)
    assert report.can_be_labelled_verified is False
    assert report.status == VerificationStatus.FAIL_CRITICAL_MISMATCH
    assert report.failed_critical_checks >= 1
    assert any("DOSE MISMATCH" in c.detail for c in report.checks if not c.passed)

def test_dropped_medicine_triggers_critical_omission():
    extraction = medical_extractor.extract_structured_facts(SAMPLE_DISCHARGE)
    
    # Drop one medicine
    plan = CarePlan(
        id="test-plan-omitted",
        document_id=extraction.document_id,
        user_id="test-user",
        version=1,
        created_at="2026-10-17T00:00:00Z",
        language="en",
        verification_status=VerificationStatus.READY_FOR_VALIDATION,
        condition_category=extraction.condition_category,
        patient_summary="Omitted plan",
        plain_diagnosis=extraction.primary_diagnosis,
        medicines=[extraction.medicines[0]], # only 1 of 2 medicines
        warning_signs=extraction.warning_signs,
        follow_ups=extraction.follow_ups,
        instructions=extraction.instructions,
        questions_for_doctor=[],
        readability_score=7.5,
        readability_level_label="Class 7-8",
        verification_summary={}
    )
    report = verification_engine.verify_care_plan(extraction, plan)
    assert report.can_be_labelled_verified is False
    assert report.status == VerificationStatus.FAIL_CRITICAL_MISMATCH
    assert any("CRITICAL OMISSION" in c.detail for c in report.checks if not c.passed)
