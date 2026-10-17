import os
from pathlib import Path
from fpdf import FPDF
from app.models.schemas import CarePlan, VerificationReport
from app.config import UPLOAD_DIR

class CalmCarePDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(15, 118, 110) # Teal
        self.cell(0, 8, "CALMCARE - VERIFIED PATIENT CARE PLAN (FRIDGE SHEET)", ln=True, align="C")
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(100, 116, 139)
        self.cell(0, 5, "Keep this summary in an easily accessible place (e.g. refrigerator).", ln=True, align="C")
        self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(0, 10, "CalmCare is an assistive tool grounded in your hospital discharge summary. In emergency, call 108.", align="C")

class PDFReportService:
    def __init__(self):
        pass

    def generate_fridge_sheet(self, plan: CarePlan) -> str:
        pdf = CalmCarePDF(orientation="P", unit="mm", format="A4")
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()

        # Patient & Verification Banner
        pdf.set_fill_color(240, 253, 250)
        pdf.rect(10, 25, 190, 18, "F")
        pdf.set_xy(12, 27)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(19, 78, 74)
        pdf.cell(90, 6, f"Patient Summary: {plan.patient_summary[:45]}...", ln=False)
        pdf.cell(90, 6, f"Verification: {plan.verification_status.value.upper()}", ln=True, align="R")
        
        pdf.set_xy(12, 33)
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(90, 5, f"Reading Level: {plan.readability_level_label}", ln=False)
        pdf.cell(90, 5, f"Generated: {plan.created_at[:10]}", ln=True, align="R")

        pdf.ln(8)

        # 1. Medications Section
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 7, "1. MEDICINES & EXACT SCHEDULE", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)

        # Table Header
        pdf.set_fill_color(226, 232, 240)
        pdf.set_font("Helvetica", "B", 9)
        pdf.cell(50, 7, "Medicine Name", 1, 0, "L", fill=True)
        pdf.cell(25, 7, "Dose", 1, 0, "C", fill=True)
        pdf.cell(40, 7, "Frequency", 1, 0, "L", fill=True)
        pdf.cell(45, 7, "Timing / Instructions", 1, 0, "L", fill=True)
        pdf.cell(30, 7, "Duration", 1, 1, "C", fill=True)

        pdf.set_font("Helvetica", "", 8.5)
        for med in plan.medicines:
            pdf.cell(50, 6.5, med.name[:25], 1, 0, "L")
            pdf.cell(25, 6.5, f"{med.dose} {med.unit}", 1, 0, "C")
            pdf.cell(40, 6.5, med.frequency[:22], 1, 0, "L")
            pdf.cell(45, 6.5, (med.timing or "With water")[:26], 1, 0, "L")
            pdf.cell(30, 6.5, (med.duration or "As directed")[:16], 1, 1, "C")

        pdf.ln(4)

        # 2. Warning Signs - Seek Immediate Help
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(190, 18, 60) # Rose / Red
        pdf.cell(0, 7, "2. WARNING SIGNS - SEEK IMMEDIATE HOSPITAL CARE", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(30, 41, 59)
        for w in plan.warning_signs[:4]:
            pdf.cell(5, 5, "-", 0, 0)
            pdf.cell(0, 5, f"{w.sign} ({w.plain_meaning})", ln=True)

        pdf.ln(4)

        # 3. Next Appointments & Follow-up
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 7, "3. NEXT APPOINTMENTS & FOLLOW-UP", ln=True)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(2)

        pdf.set_font("Helvetica", "", 9)
        if plan.follow_ups:
            for fu in plan.follow_ups:
                pdf.cell(0, 5, f"Date: {fu.date or 'As advised'} | Dept: {fu.department or 'OPD'} | Doctor: {fu.doctor or 'Consultant'}", ln=True)
        else:
            pdf.cell(0, 5, "No specific appointment date noted in summary. Call hospital if symptoms arise.", ln=True)

        pdf.ln(4)

        # 4. Diet & Activity Instructions
        if plan.instructions:
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(0, 7, "4. DIET & ACTIVITY GUIDANCE", ln=True)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)
            pdf.set_font("Helvetica", "", 9)
            for inst in plan.instructions[:3]:
                pdf.cell(5, 5, "-", 0, 0)
                pdf.cell(0, 5, f"[{inst.category.upper()}] {inst.source_instruction}", ln=True)

        out_path = os.path.join(str(UPLOAD_DIR), f"fridge_sheet_{plan.id}.pdf")
        pdf.output(out_path)
        return out_path

pdf_report_service = PDFReportService()
