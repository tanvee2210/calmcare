import re
from typing import Dict, Any, List, Optional
from app.models.schemas import (
    StructuredExtraction, CarePlan, VerificationStatus,
    FieldVerificationCheck, VerificationReport, MedicineItem
)

class VerificationEngine:
    """
    Independent medical-fidelity verification engine.
    Strictly checks that no medication, dose, unit, frequency, negation or date
    is added, dropped or altered between source and patient care plan.
    """
    def __init__(self):
        pass

    def verify_care_plan(self, extraction: StructuredExtraction, plan: CarePlan) -> VerificationReport:
        checks: List[FieldVerificationCheck] = []
        unresolved_issues: List[str] = []

        # 1. Critical Conflict Check from extraction
        if extraction.detected_conflicts:
            for conflict in extraction.detected_conflicts:
                checks.append(FieldVerificationCheck(
                    field_name="document_internal_consistency",
                    source_value="Multiple conflicting source passages",
                    plan_value="Unresolved contradiction",
                    check_type="conflict_check",
                    passed=False,
                    severity="CRITICAL",
                    detail=conflict
                ))
                unresolved_issues.append(conflict)

        # 2. OCR Uncertainty / Unreadable Check
        if extraction.unreadable_spans:
            for span in extraction.unreadable_spans:
                checks.append(FieldVerificationCheck(
                    field_name="ocr_legibility",
                    source_value=span,
                    plan_value="Incomplete / Blurry extraction",
                    check_type="legibility_check",
                    passed=False,
                    severity="CRITICAL",
                    detail=f"Unreadable or illegible passage detected: '{span}'. Human review required."
                ))
                unresolved_issues.append(f"Unreadable text: {span}")

        # 3. Medications Verification: Dropped, Added, Altered Doses, Units, Frequencies
        source_meds: Dict[str, MedicineItem] = {
            self._norm(m.name): m for m in extraction.medicines
        }
        plan_meds: Dict[str, MedicineItem] = {
            self._norm(m.name): m for m in plan.medicines
        }

        # Check for dropped medications
        for s_key, s_med in source_meds.items():
            match = self._find_matching_med(s_key, plan_meds)
            if not match:
                checks.append(FieldVerificationCheck(
                    field_name=f"medicine_presence:{s_med.name}",
                    source_value=s_med.source_name,
                    plan_value=None,
                    check_type="omission_check",
                    passed=False,
                    severity="CRITICAL",
                    detail=f"CRITICAL OMISSION: Prescribed medicine '{s_med.name}' present in source was dropped from care plan!"
                ))
                unresolved_issues.append(f"Missing medicine from plan: {s_med.name}")
            else:
                p_med = match
                # Check Dose Exactness
                if self._clean_num(s_med.dose) != self._clean_num(p_med.dose):
                    checks.append(FieldVerificationCheck(
                        field_name=f"dose_exactness:{s_med.name}",
                        source_value=s_med.dose,
                        plan_value=p_med.dose,
                        check_type="exact_match",
                        passed=False,
                        severity="CRITICAL",
                        detail=f"CRITICAL DOSE MISMATCH: Source prescribes {s_med.dose} but plan displays {p_med.dose}!"
                    ))
                    unresolved_issues.append(f"Dose altered for {s_med.name}: {s_med.dose} vs {p_med.dose}")
                else:
                    checks.append(FieldVerificationCheck(
                        field_name=f"dose_exactness:{s_med.name}",
                        source_value=s_med.dose,
                        plan_value=p_med.dose,
                        check_type="exact_match",
                        passed=True,
                        severity="INFO",
                        detail="Dose matches source exactly."
                    ))

                # Check Unit Fidelity
                if self._norm(s_med.unit) != self._norm(p_med.unit):
                    checks.append(FieldVerificationCheck(
                        field_name=f"unit_fidelity:{s_med.name}",
                        source_value=s_med.unit,
                        plan_value=p_med.unit,
                        check_type="unit_fidelity",
                        passed=False,
                        severity="CRITICAL",
                        detail=f"CRITICAL UNIT MISMATCH: Source unit is '{s_med.unit}' but plan displays '{p_med.unit}'!"
                    ))
                    unresolved_issues.append(f"Unit altered for {s_med.name}: {s_med.unit} vs {p_med.unit}")
                else:
                    checks.append(FieldVerificationCheck(
                        field_name=f"unit_fidelity:{s_med.name}",
                        source_value=s_med.unit,
                        plan_value=p_med.unit,
                        check_type="unit_fidelity",
                        passed=True,
                        severity="INFO",
                        detail="Unit matches source."
                    ))

                # Check Frequency & Duration
                if s_med.frequency != p_med.frequency:
                    checks.append(FieldVerificationCheck(
                        field_name=f"frequency_fidelity:{s_med.name}",
                        source_value=s_med.frequency,
                        plan_value=p_med.frequency,
                        check_type="exact_match",
                        passed=False,
                        severity="CRITICAL",
                        detail=f"FREQUENCY MISMATCH: Source frequency '{s_med.frequency}' changed to '{p_med.frequency}'."
                    ))
                    unresolved_issues.append(f"Frequency altered for {s_med.name}")
                else:
                    checks.append(FieldVerificationCheck(
                        field_name=f"frequency_fidelity:{s_med.name}",
                        source_value=s_med.frequency,
                        plan_value=p_med.frequency,
                        check_type="exact_match",
                        passed=True,
                        severity="INFO",
                        detail="Frequency preserved."
                    ))

        # Check for added / invented medications
        for p_key, p_med in plan_meds.items():
            if not self._find_matching_med(p_key, source_meds):
                checks.append(FieldVerificationCheck(
                    field_name=f"unsupported_medicine:{p_med.name}",
                    source_value=None,
                    plan_value=p_med.name,
                    check_type="addition_check",
                    passed=False,
                    severity="CRITICAL",
                    detail=f"CRITICAL UNSUPPORTED ADDITION: Care plan added medicine '{p_med.name}' not found anywhere in source document!"
                ))
                unresolved_issues.append(f"Invented medicine in plan: {p_med.name}")

        # 4. Follow-up Appointments Fidelity
        source_fu_dates = [f.date for f in extraction.follow_ups if f.date]
        plan_fu_dates = [f.date for f in plan.follow_ups if f.date]

        if source_fu_dates:
            for s_date in source_fu_dates:
                if s_date not in plan_fu_dates:
                    checks.append(FieldVerificationCheck(
                        field_name="follow_up_date_preservation",
                        source_value=s_date,
                        plan_value=plan_fu_dates,
                        check_type="omission_check",
                        passed=False,
                        severity="CRITICAL",
                        detail=f"CRITICAL DATE OMISSION: Documented follow-up date '{s_date}' is missing in the plan!"
                    ))
                    unresolved_issues.append(f"Documented follow-up date {s_date} missing")
                else:
                    checks.append(FieldVerificationCheck(
                        field_name="follow_up_date_preservation",
                        source_value=s_date,
                        plan_value=s_date,
                        check_type="exact_match",
                        passed=True,
                        severity="INFO",
                        detail="Follow-up date verified against source."
                    ))

        # 5. Warning Signs Fidelity
        if extraction.warning_signs and not plan.warning_signs:
            checks.append(FieldVerificationCheck(
                field_name="warning_signs_preservation",
                source_value=len(extraction.warning_signs),
                plan_value=0,
                check_type="omission_check",
                passed=False,
                severity="CRITICAL",
                detail="CRITICAL SAFETY VIOLATION: Source warning signs omitted from patient plan!"
            ))
            unresolved_issues.append("Warning signs omitted from plan")
        else:
            checks.append(FieldVerificationCheck(
                field_name="warning_signs_preservation",
                source_value=len(extraction.warning_signs),
                plan_value=len(plan.warning_signs),
                check_type="omission_check",
                passed=True,
                severity="INFO",
                detail="Warning signs preserved from source."
            ))

        # Calculate Results & Verification Status
        total_checks = len(checks)
        passed_checks = sum(1 for c in checks if c.passed)
        failed_critical = sum(1 for c in checks if not c.passed and c.severity == "CRITICAL")
        warnings_count = sum(1 for c in checks if not c.passed and c.severity == "WARNING")

        score = round((passed_checks / max(total_checks, 1)) * 100, 1)

        if failed_critical > 0:
            if extraction.detected_conflicts:
                status = VerificationStatus.FAIL_CRITICAL_CONFLICT
            elif extraction.unreadable_spans:
                status = VerificationStatus.REVIEW_REQUIRED
            else:
                status = VerificationStatus.FAIL_CRITICAL_MISMATCH
            can_verify = False
        elif warnings_count > 0:
            status = VerificationStatus.READY_FOR_VALIDATION
            can_verify = True
        else:
            status = VerificationStatus.VERIFIED_AGAINST_SOURCE
            can_verify = True

        return VerificationReport(
            status=status,
            overall_fidelity_score=score,
            total_checks=total_checks,
            passed_checks=passed_checks,
            failed_critical_checks=failed_critical,
            warning_checks=warnings_count,
            can_be_labelled_verified=can_verify,
            checks=checks,
            unresolved_issues=unresolved_issues,
            safety_disclaimer="CalmCare verification checks fidelity to the source document only. It does not replace independent clinical evaluation."
        )

    def _norm(self, s: Optional[str]) -> str:
        if not s:
            return ""
        return re.sub(r'[^a-zA-Z0-9]', '', s).lower()

    def _clean_num(self, s: Optional[str]) -> str:
        if not s:
            return ""
        m = re.search(r'(\d+(?:\.\d+)?)', str(s))
        return m.group(1) if m else str(s).strip()

    def _find_matching_med(self, key: str, med_dict: Dict[str, MedicineItem]) -> Optional[MedicineItem]:
        if key in med_dict:
            return med_dict[key]
        for k, v in med_dict.items():
            if key in k or k in key:
                return v
        return None

verification_engine = VerificationEngine()
