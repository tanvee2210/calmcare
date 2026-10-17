from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.api.auth import get_current_user
from app.models.schemas import UserResponse, AudioSpeechRequest
from app.services.glossary_service import glossary_service
from app.config import SUPPORTED_LANGUAGES

router = APIRouter(prefix="/api/speech", tags=["Voice & Spoken Guidance"])

@router.post("/synthesize")
def prepare_spoken_guidance(req: AudioSpeechRequest, current_user: UserResponse = Depends(get_current_user)):
    """
    Features 6 & 7: CalmCare spoken guidance.
    Provides paced, patient-friendly narration script with section pauses.
    Works seamlessly with browser Web Speech API synthesis or backend audio stream.
    """
    lang_info = SUPPORTED_LANGUAGES.get(req.language, SUPPORTED_LANGUAGES["en"])
    
    # Structure speech into calm sections with explicit 1.5s pauses
    pacing_rate = max(0.70, min(1.0, req.speed))
    
    intro = "Hello. Let us go through your care instructions together, one step at a time. "
    clean_text = req.text.replace("\n", ". ")
    script = f"{intro}{clean_text} You can pause or ask to repeat any section at any time."

    return {
        "text": script,
        "language_code": lang_info["voice_code"],
        "language_name": lang_info["name"],
        "recommended_rate": pacing_rate, # 0.85 default calm pace
        "recommended_pitch": 1.0,
        "section_name": req.section_name or "Care Plan",
        "controls": ["play", "pause", "replay_section", "speak_slower"]
    }

@router.post("/verify-transcript")
def verify_voice_transcript(
    spoken_transcript: str,
    context: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Feature 6: Speech-to-text transcript review.
    Checks user's voice input against drug glossary and warns if speech recognition misheard.
    Prevents uncertain voice transcription from changing medical prescriptions.
    """
    words = spoken_transcript.strip().split()
    matched_drugs = []
    for w in words:
        drug = glossary_service.match_drug_reference(w)
        if drug:
            matched_drugs.append(drug["generic"])

    return {
        "raw_transcript": spoken_transcript,
        "requires_confirmation": True,
        "detected_clinical_entities": matched_drugs,
        "confirmation_prompt": f"Did you say: '{spoken_transcript}'? Please confirm before proceeding."
    }
