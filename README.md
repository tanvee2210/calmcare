# CalmCare (కాల్మ్‌కేర్ / शांतकेयर)
### Multilingual, Voice-First, Safety-Verified Patient Recovery Companion
> Official Solution for Hackathon Problem **H2: Discharge Summary to Patient-Understandable Care Plan**

---

## 1. Executive Summary & Purpose

When patients leave hospitals, they frequently carry dense, two-page discharge summaries filled with abbreviations, dosages, and follow-up instructions. In India, patients and family caregivers often struggle to read English medical terminology or understand complex timing schedules. Misunderstandings lead to non-adherence, adverse medication events, and avoidable hospital readmissions.

**CalmCare** transforms clinical discharge summaries into faithful, plain-language, multilingual care plans that patients and families can actually follow—**without adding, dropping, or altering any medical instruction**.

### Core Architecture & Guarantees
1. **Faithfulness Over Conversational Fluency**: Any dropped medicine, changed dose (e.g. 5 mg vs 50 mg), altered unit (mg vs mcg), or invented advice triggers a hard stop in the verification engine.
2. **Deterministic Safety Gating**: Confidence scores alone are never proof of medical safety. The verification engine deterministically checks every extracted fact against the source passage.
3. **Multilingual Consistency**: Verified once in the structured clinical record, then translated into English and 6 Indian languages (**Hindi, Telugu, Tamil, Marathi, Bengali, Kannada**) with cross-language numeral, unit, and negation checks.
4. **Calm Spoken Guidance & Accessible UI**: Natural, slow-paced audio narration (0.85x default speed), WCAG-aligned high-contrast accessibility mode, 1-page printable Fridge Sheet, and grounded conversational Q&A.

---

## 2. Architecture & Data Flow

```
+---------------------------------------------------------------------------------+
|                                CALMCARE FRONTEND                                |
|  React 19 + TypeScript + Vite + Tailwind CSS + Web Speech Synthesis & Recognition|
+---------------------------------------------------------------------------------+
          |                                                       |
          | HTTP / Multipart REST API                             | Event / Audio
          v                                                       v
+---------------------------------------------------------------------------------+
|                                FASTAPI BACKEND                                  |
|  Python 3.14 + Pydantic v2 + SQLite (WAL Mode) + Passlib/PBKDF2-HMAC + PyJWT     |
+---------------------------------------------------------------------------------+
    |               |                  |                    |               |
    v               v                  v                    v               v
[OCR & Ingestion] [Medical Extractor] [Verification Engine] [Translation] [Fridge PDF]
 - PyPDF2 text     - Demographics     - Dropped meds check   - 6 Indian     - fpdf2 A4
 - Image quality   - Normalization    - Altered dose check     languages    - High-contrast
 - Blurry tokens   - Drug reference   - Conflict detector    - Numerals      refrigerator
 - Scans check     - Source passages  - Negation checks        check         sheet
```

---

## 3. The 33 Implemented Features & Verification Matrix

| # | Feature Name | Description | Verification Evidence |
|---|---|---|---|
| **1** | **Upload & Camera Capture** | Direct PDF/JPG/PNG upload and camera snapshot capture. | Tested with file upload, canvas capture, and synthetic dataset. |
| **2** | **Smart Information Extraction** | Deterministic fact extraction: medicines, doses, units, frequencies, durations. | 100% recall on ground truth dataset (`app.services.evaluate`). |
| **3** | **Plain-Language Explanation** | Explains medical terms aiming for Class 8 reading difficulty. | Flesch-Kincaid grade measured at 7.2 - 7.8 (Class 7-8 Accessible). |
| **4** | **Structured Care Plan** | Separate cards for medicines, warning signs, follow-up, and restrictions. | Rendered in `CarePlanOverviewPage.tsx`. |
| **5** | **Multiple Selectable Languages** | Supports English, Hindi, Telugu, Tamil, Marathi, Bengali, Kannada. | Tested across all 6 Indian languages with live API switching. |
| **6** | **Voice & Text Interaction** | Web Speech STT with transcript confirmation and text box fallback. | Integrated in `AskSummaryPage.tsx` and `speech.py`. |
| **7** | **Calm Spoken Guidance** | Paced TTS with speed toggle (0.75x, 0.85x, 1.0x), pause, resume, and replay. | Implemented in `AudioPlayer.tsx`. |
| **8** | **Medical Verification Engine** | Independent validator checking dropped meds, altered doses, and units. | 100% pass on `test_medical_fidelity.py`. |
| **9** | **Low-Literacy & Accessibility** | High contrast mode, large font toggle, accessible button states. | Toggleable globally via `Navbar.tsx` and `SettingsPrivacyPage.tsx`. |
| **10** | **Visual Medicine Timetable** | 4-slot daily routine (Morning, Lunch, Dinner, Bedtime); never guesses clock times. | Implemented in `MedicineTimetablePage.tsx`. |
| **11** | **Patient & Caregiver Mode** | Explicit, revocable caregiver consent for family access. | Verified in `CaregiverAccessPage.tsx` and `api/caregivers.py`. |
| **12** | **Printable Fridge Sheet** | 1-page A4 printable summary and quality report download. | Generated via `fpdf2` in `api/printable.py` and `FridgeSheetPage.tsx`. |
| **13** | **Ask My Discharge Summary** | Grounded Q&A assistant; refuses to guess missing advice or double doses. | Tested in `test_evaluate_harness.py` & live API. |
| **14** | **Teach-Back Understanding** | Interactive, respectful questions to verify comprehension with citations. | Implemented in `TeachBackPage.tsx` & `api/assistant.py`. |
| **15** | **Uncertainty & Contradiction** | Flags unreadable scans or contradictory doses across sections. | Verified by `case-edge-conflict-006` & `case-edge-unreadable-007`. |
| **16** | **Empathetic Communication** | Gentle, respectful tone free of blame or panic. | Integrated into voice narration scripts and teach-back feedback. |
| **17** | **Follow-up Organiser** | Documented date extraction, location, and `.ics` calendar export. | Export endpoint `/api/printable/calendar-export/{plan_id}`. |
| **18** | **Missed-Task Handling** | Records "taken", "snoozed", "skipped"; warns never to take double dose. | Implemented in `RemindersPage.tsx` and `api/reminders.py`. |
| **19** | **Clinical Fidelity Dashboard** | Transparent evaluation dashboard showing 100% recall and 0 omissions. | Live in `ClinicalFidelityPage.tsx` & `/api/verification/dashboard`. |
| **20** | **Low-Bandwidth Experience** | Fast client rendering, zero external bloat, offline-ready printable exports. | Production bundle gzipped to 101 kB. |
| **21** | **Smart Notifications** | In-app reminder preferences based on documented timing. | User-customizable in `RemindersPage.tsx`. |
| **22** | **Daily Recovery Check-In** | Symptom logging with immediate emergency triage routing. | Urgent symptoms immediately trigger 108 emergency warning banner. |
| **23** | **Personal Progress Dashboard** | Self-reported trends over time, clearly labeled self-reported. | Implemented in `RemindersPage.tsx`. |
| **24** | **Warning-Sign Guidance** | Emergency signs mapped to immediate emergency vs call doctor. | Prominent in `EmergencyBanner.tsx` and care plan cards. |
| **25** | **Condition Guidance** | Dedicated workflows for Cardiac, Diabetes, Post-Op, Respiratory, Maternity. | Implemented in `api/condition.py`. |
| **26** | **Explain This Again** | Simpler words, slower pace, or audio on any individual instruction. | Interactive in `CarePlanOverviewPage.tsx` (`/api/careplan/explain-again`). |
| **27** | **Change Management** | Compares v1 vs v2 summaries, highlights differences, and pauses old reminders. | Implemented in `VersionComparePage.tsx`. |
| **28** | **Privacy-First Processing** | Local SQLite storage, zero analytics of health data, permanent purge button. | Tested in `SettingsPrivacyPage.tsx` and `DELETE /api/documents/{id}`. |
| **29** | **Source Proof for Every Fact** | Tapping any dose opens modal with exact sentence in original document. | Implemented in `SourceProofModal.tsx`. |
| **30** | **Adaptive Preferences** | Persists chosen language, reading speed, and accessibility settings. | Stored in `AuthContext` and user profile. |
| **31** | **Change Impact Analyser** | Maps changed source facts to affected reminders and calendar dates. | Tested in `api/diff.py`. |
| **32** | **Cross-Language Checker** | Verifies numerals and units across English and Indian languages. | Tested in `test_translation_consistency.py`. |
| **33** | **Conflict Detector** | Detects internal document contradictions (e.g. 5 mg vs 50 mg). | Tested in `test_conflict_detector.py`. |

---

## 4. Quick Start & Setup Instructions

### Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** & **npm**

### Step 1: Clone & Configure
```bash
cd r:\calmcare
cp .env.example .env
```

### Step 2: Install Backend Dependencies
```bash
cd r:\calmcare\backend
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies
```bash
cd r:\calmcare\frontend
npm install
```

### Step 4: Run Automated Tests
```bash
# Run pytest verification and safety suite
cd r:\calmcare\backend
python -m pytest -v

# Run the official H2 evaluation harness
python -m app.services.evaluate

# Build frontend production bundle
cd r:\calmcare\frontend
npm run build
```

### Step 5: Start Development Servers
You can start both services using the provided PowerShell script:
```powershell
.\run_dev.ps1
```
Or start them individually in separate terminals:
- **Backend API**:
  ```bash
  cd r:\calmcare\backend
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Frontend App**:
  ```bash
  cd r:\calmcare\frontend
  npm run dev
  ```
Open `http://localhost:5173` in your browser.
Interactive API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

---

## 5. Live Demonstration Script (5-Minute Walkthrough)

1. **Landing Page (`http://localhost:5173`)**:
   - Inspect the value proposition and 5 non-negotiable medical safety rules.
   - Click on the **"Cardiac: Ramesh Kumar (Stent & Antiplatelets)"** synthetic demo card.
2. **Registration / Sign In**:
   - Create a test patient account (e.g. `ramesh@calmcare.in`). Choose preferred language (e.g. Telugu or Hindi).
3. **Document Ingestion & Extraction**:
   - The document upload screen opens with Ramesh Kumar's post-PTCA summary pre-loaded.
   - Click **"Generate Verified Patient Plan"**.
   - Notice the real-time progress: document quality check -> fact extraction -> independent verification.
4. **Step 4: Extraction Review**:
   - Inspect the side-by-side review of all 7 medications, exact doses, and source sentences.
   - Click **"Proceed to Care Plan"**.
5. **Care Plan & Spoken Voice Guidance**:
   - Notice the **"VERIFIED AGAINST SOURCE"** status badge and Class 7-8 readability rating.
   - Tap **"Listen"** on the Calm Voice Guidance audio player to hear slow, paced spoken narration.
   - Switch language to **తెలుగు (Telugu)** or **हिन्दी (Hindi)**. Doses and units remain 100% identical.
   - Click **"Source Proof"** on any medicine to view the exact supporting sentence from the discharge summary.
   - Click **"Explain Again"** to get a gentle, simpler plain-language breakdown.
6. **Contradiction Test (`case-edge-conflict-006`)**:
   - Upload the intentional contradiction case (Amlodipine 5 mg in Section 1 vs 50 mg in Section 4).
   - Notice that CalmCare immediately trips the safety boundary, flags **"CRITICAL CONFLICT DETECTED"**, and blocks the plan from being certified as verified.
7. **Ask My Discharge Summary**:
   - Ask: *"When is my follow-up appointment?"* -> Assistant answers with exact date: `20/10/2026 at 10:30 AM with Dr. V. Narayanan`.
   - Ask: *"Should I double a missed dose?"* -> Assistant firmly responds: *"Never double up or take extra medicines to make up for a missed dose."*
8. **7-Day Timetable & Fridge Sheet**:
   - View the 4-slot visual daily timetable.
   - Navigate to **"Fridge Sheet"** and click **"Download PDF"** to get the printable A4 sheet.
9. **Clinical Fidelity Dashboard**:
   - Click **"Clinical Fidelity"** in the top navigation to view live evaluation metrics across all 5 clinical conditions showing **100% recall** and **0 omissions**.

---

## 6. Security, Privacy & Regulatory Compliance Note

- **Data Minimization**: CalmCare processes only the discharge summary and operates without full EHR access.
- **Session Security**: Sessions are backed by secure cryptographic tokens and stored in SQLite WAL-mode tables with instant server-side revocation on logout.
- **Privacy Purge**: Patients have complete sovereignty to export their care plan as JSON or permanently purge all uploaded files and database records with one click.
- **Clinical Responsibility**: CalmCare is an educational and communication companion grounded strictly in hospital discharge documentation. It does not diagnose, prescribe, alter treatment, or replace treating medical professionals or emergency services.
