from fastapi import APIRouter, Depends
from app.api.auth import get_current_user
from app.models.schemas import UserResponse
from app.services.evaluate import evaluation_harness

router = APIRouter(prefix="/api/verification", tags=["Medical Verification & Evaluation"])

@router.get("/dashboard")
def get_clinical_fidelity_dashboard(current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 19: Clinical Fidelity Dashboard.
    Provides transparent evaluation metrics:
    - Medicine recall and exact-match rate
    - Omission rate
    - Contradiction detection rate
    - Unreadable scan detection rate
    - Grounded benchmark results across 5 clinical conditions
    """
    eval_report = evaluation_harness.evaluate_all_cases()
    return {
        "status": eval_report["overall_status"],
        "medicine_preservation_recall": eval_report["medicine_preservation_recall"],
        "total_ground_truth_medications": eval_report["total_ground_truth_medications"],
        "preserved_medications": eval_report["preserved_medications"],
        "omissions_count": eval_report["omissions_count"],
        "conflicts_properly_caught": eval_report["conflicts_properly_caught"],
        "unreadable_flags_properly_caught": eval_report["unreadable_flags_properly_caught"],
        "benchmark_cases": eval_report["case_results"],
        "safety_principles": [
            "Never infer medication timing from incomplete wording.",
            "Hard-stop penalty for dropped medications or altered dosages.",
            "Independent verification engine runs deterministically.",
            "Grounding citations link every fact back to the original source text."
        ]
    }
