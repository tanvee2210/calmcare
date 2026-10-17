export type UserRole = 'patient' | 'caregiver' | 'reviewer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  preferred_language: string;
  accessibility_mode: boolean;
  created_at: string;
}

export interface MedicineItem {
  id: string;
  name: string;
  source_name: string;
  dose: string;
  unit: string;
  frequency: string;
  timing?: string;
  route?: string;
  duration?: string;
  plain_purpose?: string;
  food_instruction?: string;
  source_passage: string;
  page_number: number;
  confidence: number;
  review_status: string;
  is_critical_flag: boolean;
  flag_reason?: string;
}

export interface WarningSignItem {
  id: string;
  sign: string;
  plain_meaning: string;
  urgency_level: 'immediate_emergency' | 'call_doctor_same_day';
  action_required: string;
  source_passage: string;
}

export interface FollowUpAppointment {
  id: string;
  date?: string;
  time?: string;
  department?: string;
  doctor?: string;
  location?: string;
  source_passage: string;
  is_confirmed: boolean;
}

export interface DietActivityInstruction {
  id: string;
  category: 'diet' | 'activity' | 'wound_care' | 'restriction';
  source_instruction: string;
  plain_language_explanation: string;
  source_passage: string;
}

export interface FieldVerificationCheck {
  field_name: string;
  source_value: any;
  plan_value: any;
  check_type: string;
  passed: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  detail: string;
}

export interface VerificationReport {
  status: 'extracted_needs_review' | 'ready_for_validation' | 'verified_against_source' | 'review_required' | 'fail_critical_mismatch' | 'fail_critical_conflict';
  overall_fidelity_score: number;
  total_checks: number;
  passed_checks: number;
  failed_critical_checks: number;
  warning_checks: number;
  can_be_labelled_verified: boolean;
  checks: FieldVerificationCheck[];
  unresolved_issues: string[];
  safety_disclaimer: string;
}

export interface CarePlan {
  id: string;
  document_id: string;
  user_id: string;
  version: number;
  created_at: string;
  language: string;
  verification_status: VerificationReport['status'];
  condition_category: string;
  patient_summary: string;
  plain_diagnosis: string;
  admission_reason?: string;
  hospital_course?: string;
  checklist?: string[];
  medicines: MedicineItem[];
  warning_signs: WarningSignItem[];
  follow_ups: FollowUpAppointment[];
  instructions: DietActivityInstruction[];
  questions_for_doctor: string[];
  readability_score: number;
  readability_level_label: string;
  verification_summary?: VerificationReport;
}

export interface AssistantAnswer {
  answer: string;
  is_grounded_in_summary: boolean;
  supporting_quote?: string;
  source_page?: number;
  caution_message?: string;
  suggested_followups?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isGrounded?: boolean;
  supportingQuote?: string;
  cautionMessage?: string;
  suggestedFollowups?: string[];
}

export interface TimetableSlot {
  slot_name: string;
  time_guidance: string;
  medicines: MedicineItem[];
}

export interface SevenDayTimetable {
  care_plan_id: string;
  slots: TimetableSlot[];
  notes: string[];
}

export interface Reminder {
  id: string;
  medicine_name: string;
  dose: string;
  slot: string;
  preferred_time: string;
  status: string;
  created_at: string;
}

export interface CaregiverShare {
  id: string;
  patient_id: string;
  caregiver_email: string;
  caregiver_name: string;
  permissions: string[];
  status: 'active' | 'pending' | 'revoked';
  created_at: string;
}
