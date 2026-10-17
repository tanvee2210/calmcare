from typing import Dict, Any, List
from fastapi import APIRouter

router = APIRouter(prefix="/api/conditions", tags=["Condition Guidance"])

CONDITION_GUIDELINES = {
    "cardiac": {
        "title": "Heart Health & Post-Procedure Recovery",
        "description": "Guidance for recovering after stent placement, heart surgery, or cardiac treatment.",
        "key_focus_areas": [
            "Medication adherence: Never skip blood thinners (antiplatelets) without cardiology permission.",
            "Salt & Fluid management: Keep salt strictly low as instructed.",
            "Activity pacing: Gentle walking, avoid lifting heavy weights (>5kg) during initial healing weeks."
        ],
        "emergency_signs": [
            "Chest pain, heaviness or tightness spreading to shoulder, arm, or neck",
            "Severe shortness of breath at rest",
            "Fainting, dizziness, or irregular rapid heartbeats"
        ]
    },
    "diabetes": {
        "title": "Diabetes Care & Blood Sugar Stability",
        "description": "Guidance for managing blood glucose, insulin, and avoiding low sugar episodes.",
        "key_focus_areas": [
            "Recognize Hypoglycemia (Low Sugar): Trembling, sweating, fast heartbeat, confusion. Take 15g fast sugar (glucose biscuit or fruit juice).",
            "Meal timing: Take meals on time after taking insulin or sulfonylurea medicines.",
            "Daily foot inspection: Never walk barefoot; check for cuts or redness."
        ],
        "emergency_signs": [
            "Blood sugar below 70 mg/dL that does not rise after eating sugar",
            "Extreme drowsiness, confusion, or difficulty waking up",
            "Persistent vomiting preventing food or water intake"
        ]
    },
    "post-op": {
        "title": "Surgical Wound & Post-Operative Healing",
        "description": "Guidance for caring for incisions and regaining mobility after surgery.",
        "key_focus_areas": [
            "Wound protection: Keep dressings clean and dry. Avoid soaking in tubs or swimming.",
            "Gentle mobility: Walk gently to avoid blood clots in the legs, but avoid heavy straining.",
            "Pain management: Take pain medicines with food as prescribed."
        ],
        "emergency_signs": [
            "Fever above 101 F with chills",
            "Foul-smelling pus, severe redness, or gaping wound edges",
            "Severe swelling or pain not helped by prescribed medication"
        ]
    },
    "respiratory": {
        "title": "Respiratory Recovery & Inhaler Techniques",
        "description": "Guidance for COPD, asthma, and lung infection recovery.",
        "key_focus_areas": [
            "Inhaler technique: Use spacer if recommended. Gargle and rinse mouth thoroughly after steroid inhalers.",
            "Breathing exercises: Use incentive spirometer as documented.",
            "Zero smoke exposure: Completely avoid cigarette smoke and burning fumes."
        ],
        "emergency_signs": [
            "Severe breathlessness not helped by quick-relief (rescue) inhaler",
            "Oxygen levels dropping below 88-90% on pulse oximeter",
            "Blue tint to lips, tongue, or fingertips"
        ]
    },
    "maternity": {
        "title": "Post-Partum & Newborn Recovery Care",
        "description": "Guidance for mother and infant following delivery or Cesarean section.",
        "key_focus_areas": [
            "Breastfeeding: Feed baby on demand every 2 to 3 hours.",
            "Incision care: Keep C-section wound dry and clean.",
            "Pelvic rest & support: Avoid lifting anything heavier than baby for 6 weeks."
        ],
        "emergency_signs": [
            "Heavy bleeding soaking more than 1 sanitary pad per hour",
            "Fever, chills, or foul-smelling vaginal discharge",
            "Painful, hot, red breast lump with fever",
            "Severe headache with vision blurring or epigastric pain"
        ]
    }
}

@router.get("/{condition_name}")
def get_condition_guidance(condition_name: str):
    cond = CONDITION_GUIDELINES.get(condition_name.lower(), {
        "title": "General Health & Recovery",
        "description": "Follow all instructions documented in your hospital summary.",
        "key_focus_areas": ["Take medicines on time", "Attend follow-up visits", "Report warning signs promptly"],
        "emergency_signs": ["Severe pain", "High fever", "Breathing difficulty"]
    })
    return cond
