import json
import re
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends

from app.api.auth import get_current_user
from app.models.schemas import (
    UserResponse, AssistantQuestion, AssistantAnswer,
    TeachBackQuestion, TeachBackSubmit, TeachBackEvaluation, CarePlan,
    ConversationDetail, ConversationSummary, ConversationMessage,
    CreateConversationRequest, SendMessageRequest
)
from app.models.database import get_db_connection

router = APIRouter(prefix="/api/assistant", tags=["Conversational Assistant & Teach-Back"])

def generate_grounded_answer(raw_text: str, plan: CarePlan, question: str) -> AssistantAnswer:
    q = question.strip().lower()

    # Safety Boundary 1: Missed dose questions
    if any(k in q for k in ["missed dose", "double dose", "forgot", "skip dose", "forgot to take"]):
        return AssistantAnswer(
            answer="Your discharge summary does not provide catch-up instructions for missed doses. As a universal clinical safety rule: NEVER double up or take extra medicines to make up for a missed dose. If you realize you missed a dose, take it only if it is not close to the next scheduled dose, or speak directly with your doctor or pharmacist.",
            is_grounded_in_summary=True,
            caution_message="Universal clinical safety rule: Never take a double dose.",
            suggested_followups=[
                "What is each of my medicines for?",
                "When is my next appointment?",
                "What should I avoid doing?"
            ]
        )

    # Safety Boundary 2: Emergency / Urgent symptoms
    if any(k in q for k in ["chest pain", "shortness of breath", "bleeding", "pass out", "blackout", "emergency", "faint", "cyanosis", "blood in urine"]):
        return AssistantAnswer(
            answer="⚠️ This symptom is an urgent warning sign! Your discharge summary instructs returning immediately to the hospital emergency department or calling emergency medical services (108 in India, or 1066 for Apollo helpline). Do not drive yourself.",
            is_grounded_in_summary=True,
            supporting_quote="Return to emergency immediately if severe chest pain, shortness of breath, sudden weakness or bleeding occurs.",
            caution_message="URGENT: Immediate in-person medical evaluation required.",
            suggested_followups=[
                "What warning signs should I watch for?",
                "When is my next appointment?",
                "What should I avoid doing?"
            ]
        )

    # Question Type A: Why was I admitted / Reason for admission / What happened in hospital
    if any(k in q for k in ["why was i admitted", "why admitted", "reason for hospital", "why was i in the hospital", "what happened in hospital", "hospital stay"]):
        reason = plan.admission_reason or plan.hospital_course or plan.patient_summary
        course = f"\n\nHospital Course: {plan.hospital_course}" if plan.hospital_course and plan.hospital_course != reason else ""
        ans = (
            f"According to your discharge summary, you were admitted for: {reason}."
            f"{course}\n\n"
            f"Your primary documented diagnosis is: {plan.plain_diagnosis}."
        )
        return AssistantAnswer(
            answer=ans,
            is_grounded_in_summary=True,
            supporting_quote=plan.admission_reason or plan.plain_diagnosis,
            suggested_followups=[
                "What is each of my medicines for?",
                "What should I avoid doing?",
                "When is my next appointment?"
            ]
        )

    # Question Type B: Hospital findings / Diagnosis
    if any(k in q for k in ["findings", "what did the hospital find", "diagnosis", "what was found", "test results"]):
        ans = f"Your discharge summary records your primary diagnosis as:\n• {plan.plain_diagnosis}"
        if plan.hospital_course:
            ans += f"\n\nDocumented Hospital Findings:\n{plan.hospital_course}"
        return AssistantAnswer(
            answer=ans,
            is_grounded_in_summary=True,
            supporting_quote=plan.plain_diagnosis,
            suggested_followups=[
                "Why was I admitted to the hospital?",
                "What is each of my medicines for?",
                "What warning signs should I watch for?"
            ]
        )

    # Question Type C: What is each of my medicines for? / All medicines explanation
    if any(k in q for k in ["each of my medicines", "all medicines", "what are my medicines", "medicines for", "explain my medicines", "list of medicines", "what pills"]):
        if not plan.medicines:
            return AssistantAnswer(
                answer="No discharge medications were documented in your summary. Please confirm with your healthcare team before taking any medications.",
                is_grounded_in_summary=True
            )
        lines = []
        for idx, m in enumerate(plan.medicines, 1):
            purpose = f" — Purpose: {m.plain_purpose}" if m.plain_purpose else " — Purpose: Not explicitly documented in summary (verify with doctor/pharmacist)"
            timing_str = f", {m.timing}" if m.timing else ""
            lines.append(f"{idx}. {m.name}: {m.dose} {m.unit}, {m.frequency}{timing_str}. (Duration: {m.duration or 'As directed'}){purpose}")
        ans = "Here is what each of your documented medicines is prescribed for:\n\n" + "\n".join(lines)
        return AssistantAnswer(
            answer=ans,
            is_grounded_in_summary=True,
            supporting_quote="; ".join(m.source_passage for m in plan.medicines[:3]),
            suggested_followups=[
                "What should I avoid doing?",
                "When is my next appointment?",
                "What warning signs should I watch for?"
            ]
        )

    # Question Type D: Specific medication lookup
    for med in plan.medicines:
        med_keywords = [w.lower() for w in re.findall(r'[A-Za-z0-9]+', med.name) if len(w) >= 3]
        if any(kw in q for kw in med_keywords):
            purpose_clause = f"\n• What it does: {med.plain_purpose}" if med.plain_purpose else "\n• Purpose: Not explicitly titled in summary; check with your pharmacist."
            food_clause = f"\n• Instructions: {med.food_instruction}" if med.food_instruction else ""
            timing_clause = f"\n• When to take: {med.timing}" if med.timing else ""
            ans = (
                f"**{med.name}**\n"
                f"• Prescribed dose: {med.dose} {med.unit}\n"
                f"• Frequency: {med.frequency}"
                f"{timing_clause}"
                f"\n• Duration: {med.duration or 'As directed by doctor'}"
                f"{purpose_clause}"
                f"{food_clause}"
            )
            return AssistantAnswer(
                answer=ans,
                is_grounded_in_summary=True,
                supporting_quote=med.source_passage,
                suggested_followups=[
                    "What is each of my medicines for?",
                    "What should I avoid doing?",
                    "When is my next appointment?"
                ]
            )

    # Question Type E: Restrictions / What should I avoid / Activity / Diet
    if any(k in q for k in ["avoid", "restrictions", "can i exercise", "can i walk", "diet", "food to avoid", "activity", "heavy lifting", "alcohol", "smoking"]):
        instructions = plan.instructions
        if instructions:
            items = []
            for inst in instructions:
                items.append(f"• [{inst.category.upper()}] {inst.plain_language_explanation}")
            ans = "Based on your discharge summary, here are your recovery instructions and restrictions to follow:\n\n" + "\n".join(items)
            return AssistantAnswer(
                answer=ans,
                is_grounded_in_summary=True,
                supporting_quote="; ".join(inst.source_passage for inst in instructions[:3]),
                suggested_followups=[
                    "What warning signs should I watch for?",
                    "When is my next appointment?",
                    "What is each of my medicines for?"
                ]
            )
        return AssistantAnswer(
            answer="Your discharge summary does not document specific diet or activity restrictions. Please verify with your doctor regarding lifting, driving, and diet.",
            is_grounded_in_summary=True
        )

    # Question Type F: Warning signs / When to seek medical help
    if any(k in q for k in ["warning sign", "warning signs", "red flag", "emergency", "when to call", "when to visit doctor", "fever", "pain"]):
        if plan.warning_signs:
            items = []
            for w in plan.warning_signs:
                urgency = "🚨 IMMEDIATE EMERGENCY" if w.urgency_level == "immediate_emergency" else "⚠️ CONTACT DOCTOR"
                items.append(f"• {w.sign} ({w.plain_meaning}) — {urgency}: {w.action_required}")
            ans = "Here are the documented warning signs from your discharge summary:\n\n" + "\n".join(items)
            return AssistantAnswer(
                answer=ans,
                is_grounded_in_summary=True,
                supporting_quote="; ".join(w.source_passage for w in plan.warning_signs[:3]),
                suggested_followups=[
                    "When is my next appointment?",
                    "What should I avoid doing?",
                    "What is each of my medicines for?"
                ]
            )

    # Question Type G: Follow-up Appointment
    if any(k in q for k in ["appointment", "follow up", "follow-up", "when do i see", "doctor visit", "next visit", "checkup"]):
        if plan.follow_ups:
            fu = plan.follow_ups[0]
            ans = f"Your documented follow-up appointment is on **{fu.date or 'the date specified by your clinic'}**"
            if fu.time:
                ans += f" at {fu.time}"
            if fu.department:
                ans += f" in the {fu.department}"
            if fu.doctor:
                ans += f" with {fu.doctor}"
            ans += ".\n\nPlease remember to bring this discharge summary and your current medication list to your appointment."
            return AssistantAnswer(
                answer=ans,
                is_grounded_in_summary=True,
                supporting_quote=fu.source_passage,
                suggested_followups=[
                    "What should I avoid doing?",
                    "What warning signs should I watch for?",
                    "What is each of my medicines for?"
                ]
            )
        return AssistantAnswer(
            answer="Your discharge summary does not state a specific follow-up appointment date. Please contact your hospital's reception or outpatient department to schedule a follow-up visit.",
            is_grounded_in_summary=True,
            suggested_followups=[
                "Why was I admitted to the hospital?",
                "What is each of my medicines for?"
            ]
        )

    # Question Type H: Simplify instructions / General summary / Next steps
    if any(k in q for k in ["explain simply", "more simply", "simpler", "explain my discharge", "next steps", "what to do next", "checklist", "what should i do"]):
        steps = plan.checklist or []
        if not steps:
            steps = [
                f"Take your {len(plan.medicines)} discharge medications according to the prescribed timing.",
                "Review warning signs and have emergency contacts ready.",
                "Follow documented diet and activity restrictions.",
                f"Attend your follow-up appointment on {plan.follow_ups[0].date if plan.follow_ups else 'as scheduled'}."
            ]
        ans = "Here is a simple summary of what you need to do next:\n\n" + "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
        return AssistantAnswer(
            answer=ans,
            is_grounded_in_summary=True,
            supporting_quote=plan.plain_diagnosis,
            suggested_followups=[
                "What is each of my medicines for?",
                "What should I avoid doing?",
                "When is my next appointment?"
            ]
        )

    # General question: search lines in discharge summary
    matching_lines = [l.strip() for l in raw_text.splitlines() if any(word in l.lower() for word in q.split() if len(word) >= 4 and word not in ["what", "when", "where", "which", "could", "would", "about", "your", "this", "that"])]
    if matching_lines:
        return AssistantAnswer(
            answer=f"Here is what your discharge summary explicitly states regarding this: \"{matching_lines[0]}\"",
            is_grounded_in_summary=True,
            supporting_quote=matching_lines[0],
            suggested_followups=[
                "Why was I admitted to the hospital?",
                "What is each of my medicines for?",
                "When is my next appointment?"
            ]
        )

    # Honest admission of uncertainty / missing advice
    return AssistantAnswer(
        answer="Your discharge summary does not mention this specific topic. CalmCare cannot guess or invent medical instructions. Please check with your treating healthcare team for guidance.",
        is_grounded_in_summary=False,
        caution_message="Information absent from discharge summary.",
        suggested_followups=[
            "Why was I admitted to the hospital?",
            "What is each of my medicines for?",
            "When is my next appointment?"
        ]
    )

@router.post("/ask", response_model=AssistantAnswer)
def ask_discharge_summary(req: AssistantQuestion, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 13: Ask My Discharge Summary assistant.
    Strictly grounded in current verified plan and cited source passages.
    """
    conn = get_db_connection()
    doc_row = conn.execute("SELECT raw_text FROM documents WHERE id = ? AND user_id = ?", (req.document_id, current_user.id)).fetchone()
    plan_row = conn.execute("SELECT plan_data_json FROM care_plans WHERE document_id = ? ORDER BY version DESC LIMIT 1", (req.document_id,)).fetchone()
    conn.close()

    if not doc_row or not plan_row:
        raise HTTPException(status_code=404, detail="Document or Care Plan not found.")

    raw_text = doc_row["raw_text"]
    plan = CarePlan(**json.loads(plan_row["plan_data_json"]))
    return generate_grounded_answer(raw_text, plan, req.question)

@router.get("/conversations", response_model=List[ConversationSummary])
def list_conversations(current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT c.id, c.user_id, c.document_id, c.title, c.created_at, c.updated_at,
                  (SELECT text FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_msg
           FROM conversations c
           WHERE c.user_id = ?
           ORDER BY c.updated_at DESC""",
        (current_user.id,)
    ).fetchall()
    conn.close()

    return [
        ConversationSummary(
            id=r["id"],
            user_id=r["user_id"],
            document_id=r["document_id"],
            title=r["title"],
            created_at=r["created_at"],
            updated_at=r["updated_at"],
            last_message=r["last_msg"]
        )
        for r in rows
    ]

@router.post("/conversations", response_model=ConversationDetail)
def create_conversation(req: CreateConversationRequest, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    doc_id = req.document_id
    if not doc_id:
        doc_row = conn.execute("SELECT id FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (current_user.id,)).fetchone()
        if doc_row:
            doc_id = doc_row["id"]
    
    conv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    title = req.title or "Discharge Summary Q&A"

    with conn:
        conn.execute(
            "INSERT INTO conversations (id, user_id, document_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (conv_id, current_user.id, doc_id, title, now, now)
        )
    conn.close()

    return ConversationDetail(
        id=conv_id,
        user_id=current_user.id,
        document_id=doc_id,
        title=title,
        created_at=now,
        updated_at=now,
        messages=[]
    )

@router.get("/conversations/{conv_id}", response_model=ConversationDetail)
def get_conversation(conv_id: str, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    conv = conn.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conv_id, current_user.id)).fetchone()
    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found.")

    msg_rows = conn.execute(
        "SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC",
        (conv_id,)
    ).fetchall()
    conn.close()

    messages = [
        ConversationMessage(
            id=m["id"],
            conversation_id=m["conversation_id"],
            sender=m["sender"],
            text=m["text"],
            supporting_quote=m["supporting_quote"],
            caution_message=m["caution_message"],
            is_grounded=bool(m["is_grounded"]),
            created_at=m["created_at"]
        )
        for m in msg_rows
    ]

    return ConversationDetail(
        id=conv["id"],
        user_id=conv["user_id"],
        document_id=conv["document_id"],
        title=conv["title"],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
        messages=messages
    )

@router.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    conv = conn.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?", (conv_id, current_user.id)).fetchone()
    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found.")

    with conn:
        conn.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.close()
    return {"status": "success", "message": "Conversation deleted"}

@router.post("/conversations/{conv_id}/messages")
def post_conversation_message(conv_id: str, req: SendMessageRequest, current_user: UserResponse = Depends(get_current_user)):
    conn = get_db_connection()
    conv = conn.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?", (conv_id, current_user.id)).fetchone()
    if not conv:
        conn.close()
        raise HTTPException(status_code=404, detail="Conversation not found.")

    doc_id = req.document_id or conv["document_id"]
    if not doc_id:
        doc_row = conn.execute("SELECT id FROM documents WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", (current_user.id,)).fetchone()
        if doc_row:
            doc_id = doc_row["id"]

    if not doc_id:
        conn.close()
        raise HTTPException(status_code=400, detail="No discharge document uploaded yet.")

    doc_row = conn.execute("SELECT raw_text FROM documents WHERE id = ? AND user_id = ?", (doc_id, current_user.id)).fetchone()
    plan_row = conn.execute("SELECT plan_data_json FROM care_plans WHERE document_id = ? ORDER BY version DESC LIMIT 1", (doc_id,)).fetchone()

    if not doc_row or not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Care plan or document not found.")

    raw_text = doc_row["raw_text"]
    plan = CarePlan(**json.loads(plan_row["plan_data_json"]))
    answer = generate_grounded_answer(raw_text, plan, req.text)

    now = datetime.now(timezone.utc).isoformat()
    user_msg_id = str(uuid.uuid4())
    assistant_msg_id = str(uuid.uuid4())

    new_title = conv["title"]
    if conv["title"] in ["Discharge Summary Q&A", "New Conversation"]:
        new_title = req.text[:40].strip() + ("..." if len(req.text) > 40 else "")

    with conn:
        conn.execute(
            """INSERT INTO chat_messages (id, conversation_id, sender, text, supporting_quote, caution_message, is_grounded, created_at)
               VALUES (?, ?, 'user', ?, NULL, NULL, 1, ?)""",
            (user_msg_id, conv_id, req.text, now)
        )
        conn.execute(
            """INSERT INTO chat_messages (id, conversation_id, sender, text, supporting_quote, caution_message, is_grounded, created_at)
               VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?)""",
            (assistant_msg_id, conv_id, answer.answer, answer.supporting_quote, answer.caution_message, 1 if answer.is_grounded_in_summary else 0, now)
        )
        conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (new_title, now, conv_id)
        )
    conn.close()

    return {
        "user_message": {
            "id": user_msg_id,
            "conversation_id": conv_id,
            "sender": "user",
            "text": req.text,
            "created_at": now
        },
        "assistant_message": {
            "id": assistant_msg_id,
            "conversation_id": conv_id,
            "sender": "assistant",
            "text": answer.answer,
            "supporting_quote": answer.supporting_quote,
            "caution_message": answer.caution_message,
            "is_grounded": answer.is_grounded_in_summary,
            "suggested_followups": answer.suggested_followups,
            "created_at": now
        }
    }

@router.get("/teach-back/{plan_id}", response_model=List[TeachBackQuestion])
def get_teach_back_questions(plan_id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Feature 14: Teach-back understanding check.
    Generates respectful, non-evaluative questions grounded in the verified plan.
    """
    conn = get_db_connection()
    row = conn.execute("SELECT plan_data_json FROM care_plans WHERE id = ? AND user_id = ?", (plan_id, current_user.id)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Care plan not found.")

    plan = CarePlan(**json.loads(row["plan_data_json"]))
    questions: List[TeachBackQuestion] = []

    # Question 1: Follow-up date
    if plan.follow_ups and plan.follow_ups[0].date:
        fu = plan.follow_ups[0]
        questions.append(TeachBackQuestion(
            id="tb-fu-1",
            question="When does your discharge summary instruct you to come for your next hospital follow-up?",
            options=[
                f"On {fu.date} (Documented date)",
                "Only if I feel sick after 6 months",
                "I do not need to follow up with any doctor"
            ],
            correct_option_index=0,
            instruction_explanation=f"Your summary lists a review appointment on {fu.date} in {fu.department or 'OPD'}.",
            source_citation=fu.source_passage
        ))

    # Question 2: First medicine
    if plan.medicines:
        m = plan.medicines[0]
        questions.append(TeachBackQuestion(
            id=f"tb-med-1",
            question=f"How often does your discharge summary instruct you to take {m.name}?",
            options=[
                f"{m.frequency} (Exactly as written)",
                "Double the dose whenever feeling tired",
                "Stop taking it after 1 day"
            ],
            correct_option_index=0,
            instruction_explanation=f"Your summary prescribes {m.name} {m.dose} {m.unit} {m.frequency}.",
            source_citation=m.source_passage
        ))

    # Question 3: Warning signs
    if plan.warning_signs:
        w = plan.warning_signs[0]
        questions.append(TeachBackQuestion(
            id="tb-warn-1",
            question=f"What should you do if you experience: '{w.sign}'?",
            options=[
                "Return to the hospital emergency department or call doctor immediately",
                "Ignore it and wait for several days",
                "Search online and take home remedies"
            ],
            correct_option_index=0,
            instruction_explanation=f"This is a documented warning sign that requires urgent medical attention.",
            source_citation=w.source_passage
        ))

    return questions

@router.post("/teach-back/submit", response_model=TeachBackEvaluation)
def evaluate_teach_back(submission: TeachBackSubmit, current_user: UserResponse = Depends(get_current_user)):
    is_correct = (submission.selected_option_index == 0)
    
    if is_correct:
        reassurance = "Excellent! You have clearly identified the instruction documented in your hospital summary."
    else:
        reassurance = "No problem at all! Let us review this instruction together calmly so you feel completely confident."

    return TeachBackEvaluation(
        question_id=submission.question_id,
        is_correct=is_correct,
        explanation="Always verify against the exact words in your discharge summary.",
        patient_reassurance=reassurance,
        source_citation="Cited from your hospital discharge summary record."
    )
