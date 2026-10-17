from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    REVIEWER = "reviewer"
    ADMIN = "admin"

class VerificationStatus(str, Enum):
    EXTRACTED_NEEDS_REVIEW = "extracted_needs_review"
    READY_FOR_VALIDATION = "ready_for_validation"
    VERIFIED_AGAINST_SOURCE = "verified_against_source"
    REVIEW_REQUIRED = "review_required"
    FAIL_CRITICAL_MISMATCH = "fail_critical_mismatch"
    FAIL_CRITICAL_CONFLICT = "fail_critical_conflict"

# --- Authentication Schemas ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.PATIENT
    preferred_language: str = "en"
    accessibility_mode: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    preferred_language: str
    accessibility_mode: bool
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

# --- Caregiver Consent Schemas ---
class CaregiverInvite(BaseModel):
    caregiver_email: EmailStr
    caregiver_name: str
    permissions: List[str] = ["view_plan", "receive_reminders"]

class CaregiverResponse(BaseModel):
    id: str
    patient_id: str
    caregiver_email: str
    caregiver_name: str
    permissions: List[str]
    status: str # "pending", "active", "revoked"
    created_at: str

class CaregiverConsentUpdate(BaseModel):
    status: str # "active" or "revoked"
    permissions: Optional[List[str]] = None

# --- Clinical Structured Extraction Schemas ---
class MedicineItem(BaseModel):
    id: str
    name: str
    source_name: str
    dose: str
    unit: str
    frequency: str
    timing: Optional[str] = None
    route: Optional[str] = "Oral"
    duration: Optional[str] = None
    plain_purpose: Optional[str] = None
    food_instruction: Optional[str] = None
    source_passage: str
    page_number: int = 1
    confidence: float = 1.0 # 0.0 to 1.0
    review_status: str = "extracted" # "extracted", "confirmed", "flagged"
    is_critical_flag: bool = False
    flag_reason: Optional[str] = None

class WarningSignItem(BaseModel):
    id: str
    sign: str
    plain_meaning: str
    urgency_level: str # "immediate_emergency" or "call_doctor_same_day"
    action_required: str
    source_passage: str

class FollowUpAppointment(BaseModel):
    id: str
    date: Optional[str] = None
    time: Optional[str] = None
    department: Optional[str] = None
    doctor: Optional[str] = None
    location: Optional[str] = None
    source_passage: str
    is_confirmed: bool = False

class DietActivityInstruction(BaseModel):
    id: str
    category: str # "diet", "activity", "wound_care", "restriction"
    source_instruction: str
    plain_language_explanation: str
    source_passage: str

class StructuredExtraction(BaseModel):
    document_id: str
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    primary_diagnosis: str
    condition_category: str # "cardiac", "diabetes", "post-op", "respiratory", "maternity", "general"
    medicines: List[MedicineItem]
    warning_signs: List[WarningSignItem]
    follow_ups: List[FollowUpAppointment]
    instructions: List[DietActivityInstruction]
    admission_reason: Optional[str] = None
    hospital_course: Optional[str] = None
    checklist: Optional[List[str]] = None
    unreadable_spans: List[str] = []
    detected_conflicts: List[str] = []
    raw_text: str
    overall_ocr_confidence: float = 0.95

# --- Care Plan Presentation Schemas ---
class PlainLanguageSection(BaseModel):
    title: str
    content: str
    audio_text: Optional[str] = None
    source_citation: Optional[str] = None

class CarePlan(BaseModel):
    id: str
    document_id: str
    user_id: str
    version: int = 1
    created_at: str
    language: str = "en"
    verification_status: VerificationStatus
    condition_category: str
    patient_summary: str
    plain_diagnosis: str
    admission_reason: Optional[str] = None
    hospital_course: Optional[str] = None
    checklist: Optional[List[str]] = None
    medicines: List[MedicineItem]
    warning_signs: List[WarningSignItem]
    follow_ups: List[FollowUpAppointment]
    instructions: List[DietActivityInstruction]
    questions_for_doctor: List[str]
    readability_score: float # Flesch-Kincaid grade
    readability_level_label: str # e.g. "Class 7-8 (Accessible)"
    verification_summary: Dict[str, Any]

# --- Medical Fidelity Engine Schemas ---
class FieldVerificationCheck(BaseModel):
    field_name: str
    source_value: Any
    plan_value: Any
    check_type: str # "exact_match", "unit_fidelity", "omission_check", "addition_check", "negation_check"
    passed: bool
    severity: str # "CRITICAL", "WARNING", "INFO"
    detail: str

class VerificationReport(BaseModel):
    status: VerificationStatus
    overall_fidelity_score: float
    total_checks: int
    passed_checks: int
    failed_critical_checks: int
    warning_checks: int
    can_be_labelled_verified: bool
    checks: List[FieldVerificationCheck]
    unresolved_issues: List[str]
    safety_disclaimer: str

# --- Translation & Speech Schemas ---
class TranslationRequest(BaseModel):
    target_language: str # "hi", "te", "ta", "mr", "bn", "kn", "en"
    care_plan_id: str

class TranslationResult(BaseModel):
    language: str
    care_plan: CarePlan
    cross_language_verification: Dict[str, Any]

class AudioSpeechRequest(BaseModel):
    text: str
    language: str = "en"
    speed: float = 0.85 # slightly slower, calm pace
    section_name: Optional[str] = None

# --- Assistant Q&A & Teach-back Schemas ---
class AssistantQuestion(BaseModel):
    document_id: str
    question: str
    conversation_history: Optional[List[Dict[str, str]]] = None

class AssistantAnswer(BaseModel):
    answer: str
    is_grounded_in_summary: bool
    supporting_quote: Optional[str] = None
    source_page: Optional[int] = None
    caution_message: Optional[str] = None
    suggested_followups: Optional[List[str]] = None

class TeachBackQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_option_index: int
    instruction_explanation: str
    source_citation: str

class TeachBackSubmit(BaseModel):
    question_id: str
    selected_option_index: int

class TeachBackEvaluation(BaseModel):
    question_id: str
    is_correct: bool
    explanation: str
    patient_reassurance: str
    source_citation: str

# --- Medicine Timetable & Reminders Schemas ---
class TimetableSlot(BaseModel):
    slot_name: str # "Morning", "Afternoon", "Evening", "Night"
    time_guidance: str # e.g. "With breakfast (as documented)"
    medicines: List[MedicineItem]

class SevenDayTimetable(BaseModel):
    care_plan_id: str
    slots: List[TimetableSlot]
    notes: List[str]

class ReminderCreate(BaseModel):
    medicine_name: str
    dose: str
    reminder_slot: str
    user_preferred_time: str # e.g. "08:00 AM" (explicitly labeled user preference)
    recurrence: str = "Daily"

class ReminderLogAction(BaseModel):
    reminder_id: str
    action: str # "taken", "snoozed", "skipped"
    notes: Optional[str] = None

class DailyCheckInSubmit(BaseModel):
    feeling_level: str # "better", "same", "worse"
    symptoms: List[str]
    urgent_symptom_detected: bool = False
    urgent_guidance: Optional[str] = None
    completed_all_meds: bool
    notes: Optional[str] = None

# --- Version Diff & Impact Analysis Schemas ---
class VersionDiffResponse(BaseModel):
    old_plan_id: str
    new_plan_id: str
    medicine_changes: List[Dict[str, Any]]
    date_changes: List[Dict[str, Any]]
    affected_active_reminders: List[str]
    required_review_actions: List[str]

# --- Persistent Chat Conversation Schemas ---
class ConversationMessage(BaseModel):
    id: str
    conversation_id: str
    sender: str
    text: str
    supporting_quote: Optional[str] = None
    caution_message: Optional[str] = None
    is_grounded: bool = True
    created_at: str

class ConversationDetail(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    title: str
    created_at: str
    updated_at: str
    messages: List[ConversationMessage] = []

class ConversationSummary(BaseModel):
    id: str
    user_id: str
    document_id: Optional[str] = None
    title: str
    created_at: str
    updated_at: str
    last_message: Optional[str] = None

class CreateConversationRequest(BaseModel):
    document_id: Optional[str] = None
    title: Optional[str] = "Discharge Summary Q&A"

class SendMessageRequest(BaseModel):
    text: str
    document_id: Optional[str] = None

