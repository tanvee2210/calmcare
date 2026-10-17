import pytest
from app.services.medical_extractor import medical_extractor
from app.services.translation_service import translation_service
from app.models.schemas import CarePlan, VerificationStatus

SAMPLE_DOC = """
PATIENT: Sunita Devi
DIAGNOSIS: Post-partum recovery
MEDICATIONS:
1. Tab. Orofer-XT 100 mg - Once daily (OD) - After lunch - Duration: 3 months
2. Tab. Shelcal 500 mg - Twice daily (BD) - After meals - Duration: 6 months
FOLLOW-UP:
Review on 19/10/2026.
"""

def test_translation_preserves_critical_facts():
    extraction = medical_extractor.extract_structured_facts(SAMPLE_DOC)
    plan = CarePlan(
        id="base-plan",
        document_id=extraction.document_id,
        user_id="user-1",
        version=1,
        created_at="2026-10-17T00:00:00Z",
        language="en",
        verification_status=VerificationStatus.VERIFIED_AGAINST_SOURCE,
        condition_category="maternity",
        patient_summary="Post-partum care plan",
        plain_diagnosis="Recovery after childbirth",
        medicines=extraction.medicines,
        warning_signs=extraction.warning_signs,
        follow_ups=extraction.follow_ups,
        instructions=extraction.instructions,
        questions_for_doctor=[],
        readability_score=7.2,
        readability_level_label="Class 7-8",
        verification_summary={}
    )

    for lang in ["hi", "te", "ta", "mr", "bn", "kn"]:
        trans_plan = translation_service.translate_care_plan(plan, lang)
        assert trans_plan.language == lang
        
        # Verify cross language consistency
        consistency = translation_service.verify_cross_language_consistency(plan, trans_plan)
        assert consistency["is_consistent"] is True
        assert consistency["status"] == "CONSISTENT_VERIFIED"
        assert len(trans_plan.medicines) == len(plan.medicines)
        # Ensure doses remained intact
        for m_orig, m_trans in zip(plan.medicines, trans_plan.medicines):
            assert m_orig.dose == m_trans.dose
            assert m_orig.unit == m_trans.unit
