import re
from typing import Dict, Any, List
from app.models.schemas import CarePlan, MedicineItem, WarningSignItem, FollowUpAppointment, DietActivityInstruction

class TranslationService:
    def __init__(self):
        # Clinical phrase translations for high-fidelity rendering
        self.lexicon = {
            "hi": {
                "care_plan_title": "आपकी देखभाल योजना (Care Plan)",
                "medicines_title": "दवाइयां और लेने का सही तरीका",
                "warnings_title": "खतरे के लक्षण - तुरंत अस्पताल जाएं",
                "diet_title": "खान-पान और परहेज",
                "activity_title": "शारीरिक गतिविधि और आराम",
                "wound_title": "घाव की देखभाल",
                "follow_up_title": "अगली डॉक्टर मुलाकात (Follow-up)",
                "instructions_summary": "यह योजना सीधे आपके अस्पताल के डिस्चार्ज सारांश के आधार पर तैयार की गई है।",
                "emergency_call": "आपातकालीन स्थिति में तुरंत 108 या अपने नजदीकी अस्पताल से संपर्क करें।",
                "frequency_map": {
                    "Once daily": "दिन में एक बार",
                    "Twice daily": "दिन में दो बार",
                    "Three times daily": "दिन में तीन बार",
                    "Four times daily": "दिन में चार बार",
                    "SOS / As needed": "ज़रूरत पड़ने पर (दर्द या बुखार होने पर)",
                    "Once daily at bedtime": "रोज रात को सोने से पहले"
                },
                "timing_map": {
                    "Before breakfast (on empty stomach)": "सुबह खाली पेट नाश्ते से 30 मिनट पहले",
                    "After food": "खाना खाने के बाद",
                    "Before food": "खाना खाने से पहले",
                    "At bedtime": "सोते समय",
                    "With meals": "खाने के साथ",
                    "Place under the tongue": "जीभ के नीचे रखें"
                }
            },
            "te": {
                "care_plan_title": "మీ రికవరీ సంరక్షణ ప్రణాళిక (Care Plan)",
                "medicines_title": "మందులు & వాడాల్సిన సమయాలు",
                "warnings_title": "ప్రమాద సంకేతాలు - వెంటనే ఆసుపత్రికి వెళ్లండి",
                "diet_title": "ఆహార నియమాలు & జాగ్రత్తలు",
                "activity_title": "విశ్రాంతి & వ్యాయామ మార్గదర్శకాలు",
                "wound_title": "గాయం సంరక్షణ జాగ్రత్తలు",
                "follow_up_title": "తదుపరి డాక్టర్ సంప్రదింపు (Follow-up)",
                "instructions_summary": "ఈ సమాచారం మీ డిశ్చార్జ్ సారాంశం ఆధారంగా తయారుచేయబడింది.",
                "emergency_call": "అత్యవసర పరిస్థితుల్లో వెంటనే 108 లేదా మీ ఆసుపత్రిని సంప్రదించండి.",
                "frequency_map": {
                    "Once daily": "రోజుకు ఒకసారి",
                    "Twice daily": "రోజుకు రెండుసార్లు",
                    "Three times daily": "రోజుకు మూడుసార్లు",
                    "Four times daily": "రోజుకు నాలుగుసార్లు",
                    "SOS / As needed": "అవసరమైనప్పుడు మాత్రమే",
                    "Once daily at bedtime": "రోజూ రాత్రి పడుకునే ముందు"
                },
                "timing_map": {
                    "Before breakfast (on empty stomach)": "ఉదయం పరగడుపున టిఫిన్ కంటే ముందు",
                    "After food": "భోజనం తర్వాత",
                    "Before food": "భోజనానికి ముందు",
                    "At bedtime": "రాత్రి పడుకునే ముందు",
                    "With meals": "ఆహారంతో పాటు",
                    "Place under the tongue": "నాలుక కింద ఉంచండి"
                }
            },
            "ta": {
                "care_plan_title": "உங்கள் மீட்பு பராமரிப்பு திட்டம் (Care Plan)",
                "medicines_title": "மருந்துகள் & உட்கொள்ளும் முறைகள்",
                "warnings_title": "எச்சரிக்கை அறிகுறிகள் - உடனடியாக மருத்துவமனைக்கு செல்லவும்",
                "diet_title": "உணவு வழிகாட்டுதல்",
                "activity_title": "ஓய்வு & செயல்பாடுகள்",
                "wound_title": "காயம் பராமரிப்பு",
                "follow_up_title": "அடுத்த மருத்துவ சந்திப்பு (Follow-up)",
                "instructions_summary": "இந்த திட்டம் உங்கள் டிஸ்சார்ஜ் சுருக்கத்தை அடிப்படையாகக் கொண்டது.",
                "emergency_call": "அவசர காலத்தில் உடனடியாக 108 அல்லது உங்கள் மருத்துவமனையை தொடர்பு கொள்ளவும்.",
                "frequency_map": {
                    "Once daily": "தினசரி ஒரு முறை",
                    "Twice daily": "தினசரி இரண்டு முறை",
                    "Three times daily": "தினசரி மூன்று முறை",
                    "SOS / As needed": "தேவைப்படும் போது மட்டும்",
                    "Once daily at bedtime": "இரவு தூங்கும் முன்"
                },
                "timing_map": {
                    "Before breakfast (on empty stomach)": "காலை வெறும் வயிற்றில்",
                    "After food": "உணவுக்குப் பின்",
                    "Before food": "உணவுக்கு முன்",
                    "At bedtime": "இரவு உறங்கும் முன்"
                }
            },
            "mr": {
                "care_plan_title": "आपली काळजी योजना (Care Plan)",
                "medicines_title": "औषधे आणि घेण्याची योग्य पद्धत",
                "warnings_title": "धोक्याची लक्षणे - तातडीने रुग्णालयात जा",
                "diet_title": "आहार आणि पथ्य",
                "activity_title": "शारीरिक हालचाल आणि विश्रांती",
                "wound_title": "जखमेची काळजी",
                "follow_up_title": "पुढील तपासणी तारीख (Follow-up)",
                "instructions_summary": "ही योजना आपल्या डिस्चार्ज समरीवर आधारित आहे.",
                "emergency_call": "तातडीच्या प्रसंगी त्वरित १०८ किंवा आपल्या डॉक्टरांशी संपर्क साधा.",
                "frequency_map": {
                    "Once daily": "दिवसातून एकदा",
                    "Twice daily": "दिवसातून दोनदा",
                    "Three times daily": "दिवसातून तीनदा",
                    "SOS / As needed": "गरज असल्यास",
                    "Once daily at bedtime": "रात्री झोपताना"
                },
                "timing_map": {
                    "Before breakfast (on empty stomach)": "सकाळी रिकाम्या पोटी",
                    "After food": "जेवणानंतर",
                    "Before food": "जेवणापूर्वी"
                }
            },
            "bn": {
                "care_plan_title": "আপনার যত্ন পরিকল্পনা (Care Plan)",
                "medicines_title": "ওষুধ এবং সেবনের নিয়ম",
                "warnings_title": "সতর্কতামূলক লক্ষণ - অবিলম্বে হাসপাতালে যান",
                "diet_title": "খাবার ও পথ্য",
                "activity_title": "বিশ্রাম ও সতর্কতা",
                "wound_title": "ক্ষতের যত্ন",
                "follow_up_title": "পরবর্তী ডাক্তারের সাক্ষাৎ (Follow-up)",
                "instructions_summary": "এই পরিকল্পনা সরাসরি আপনার ডিসচার্জ সামারির উপর ভিত্তি করে তৈরি।",
                "emergency_call": "জরুরী অবস্থায় অবিলম্বে ১০৮ বা নিকটস্থ হাসপাতালে যোগাযোগ করুন।",
                "frequency_map": {
                    "Once daily": "দিনে একবার",
                    "Twice daily": "দিনে দুইবার",
                    "Three times daily": "দিনে তিনবার",
                    "SOS / As needed": "প্রয়োজনে",
                    "Once daily at bedtime": "রাতে ঘুমানোর আগে"
                },
                "timing_map": {
                    "Before breakfast (on empty stomach)": "সকালে খালি পেটে",
                    "After food": "খাওয়ার পর",
                    "Before food": "খাওয়ার আগে"
                }
            },
            "kn": {
                "care_plan_title": "ನಿಮ್ಮ ಚೇತರಿಕೆಯ ಆರೈಕೆ ಯೋಜನೆ (Care Plan)",
                "medicines_title": "ಔಷಧಿಗಳು ಮತ್ತು ತೆಗೆದುಕೊಳ್ಳುವ ವಿಧಾನ",
                "warnings_title": "ಎಚ್ಚರಿಕೆಯ ಚಿಹ್ನೆಗಳು - ತಕ್ಷಣ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ",
                "diet_title": "ಆಹಾರ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆಗಳು",
                "activity_title": "ವಿಶ್ರಾಂತಿ ಮತ್ತು ದೈಹಿಕ ಚಟುವಟಿಕೆ",
                "wound_title": "ಗಾಯದ ಆರೈಕೆ",
                "follow_up_title": "ಮುಂದಿನ ವೈದ್ಯರ ಭೇಟಿ (Follow-up)",
                "instructions_summary": "ಈ ಮಾಹಿತಿಯನ್ನು ನಿಮ್ಮ ಡಿಸ್ಚಾರ್ಜ್ ಸಾರಾಂಶದಿಂದ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ.",
                "emergency_call": "ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ ತಕ್ಷಣ 108 ಅಥವಾ ನಿಮ್ಮ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
                "frequency_map": {
                    "Once daily": "ದಿನಕ್ಕೆ ಒಂದು ಬಾರಿ",
                    "Twice daily": "ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ",
                    "Three times daily": "ದಿನಕ್ಕೆ ಮೂರು ಬಾರಿ",
                    "SOS / As needed": "ಅಗತ್ಯವಿದ್ದಾಗ ಮಾತ್ರ",
                    "Once daily at bedtime": "ರಾತ್ರಿ ಮಲಗುವ ಮುನ್ನ"
                },
                "timing_map": {
                    "Before breakfast (on empty stomach)": "ಬೆಳಿಗ್ಗೆ ಖಾಲಿ ಹೊಟ್ಟೆಯಲ್ಲಿ",
                    "After food": "ಊಟದ ನಂತರ",
                    "Before food": "ಊಟಕ್ಕೆ ಮುಂಚೆ"
                }
            }
        }

    def translate_care_plan(self, plan: CarePlan, target_lang: str) -> CarePlan:
        if target_lang == "en" or target_lang not in self.lexicon:
            return plan

        lang_dict = self.lexicon[target_lang]
        freq_map = lang_dict.get("frequency_map", {})
        timing_map = lang_dict.get("timing_map", {})

        # Translate medicines while strictly preserving exact dose numbers and units
        translated_meds: List[MedicineItem] = []
        for m in plan.medicines:
            translated_freq = freq_map.get(m.frequency, m.frequency)
            translated_timing = timing_map.get(m.timing, m.timing) if m.timing else None
            
            # Keep brand/generic name legible, add translated timing
            translated_meds.append(MedicineItem(
                id=m.id,
                name=m.name,
                source_name=m.source_name,
                dose=m.dose, # strictly unchanged
                unit=m.unit, # strictly unchanged
                frequency=translated_freq,
                timing=translated_timing,
                route=m.route,
                duration=m.duration,
                plain_purpose=m.plain_purpose,
                food_instruction=m.food_instruction,
                source_passage=m.source_passage,
                page_number=m.page_number,
                confidence=m.confidence,
                review_status=m.review_status,
                is_critical_flag=m.is_critical_flag,
                flag_reason=m.flag_reason
            ))

        # Warning signs with translated headers and plain explanations
        translated_warnings: List[WarningSignItem] = []
        for w in plan.warning_signs:
            translated_warnings.append(WarningSignItem(
                id=w.id,
                sign=w.sign,
                plain_meaning=w.plain_meaning,
                urgency_level=w.urgency_level,
                action_required=lang_dict.get("warnings_title", w.action_required),
                source_passage=w.source_passage
            ))

        new_plan = CarePlan(
            id=f"{plan.id}-{target_lang}",
            document_id=plan.document_id,
            user_id=plan.user_id,
            version=plan.version,
            created_at=plan.created_at,
            language=target_lang,
            verification_status=plan.verification_status,
            condition_category=plan.condition_category,
            patient_summary=f"{lang_dict.get('instructions_summary', '')} {plan.patient_summary}",
            plain_diagnosis=plan.plain_diagnosis,
            admission_reason=plan.admission_reason,
            hospital_course=plan.hospital_course,
            checklist=plan.checklist,
            medicines=translated_meds,
            warning_signs=translated_warnings,
            follow_ups=plan.follow_ups,
            instructions=plan.instructions,
            questions_for_doctor=plan.questions_for_doctor,
            readability_score=plan.readability_score,
            readability_level_label=plan.readability_level_label,
            verification_summary=plan.verification_summary
        )

        return new_plan

    def verify_cross_language_consistency(self, original_plan: CarePlan, translated_plan: CarePlan) -> Dict[str, Any]:
        """
        Feature 32: Cross-language meaning consistency checker.
        Validates that critical numerals, units, medicine count, and dates are preserved.
        """
        issues = []
        is_consistent = True

        # Check medicine count
        if len(original_plan.medicines) != len(translated_plan.medicines):
            issues.append("Discrepancy in total medication count between languages.")
            is_consistent = False

        # Check dose & unit preservation per medicine
        for orig, trans in zip(original_plan.medicines, translated_plan.medicines):
            if orig.dose != trans.dose:
                issues.append(f"Dose altered during translation for {orig.name}: {orig.dose} vs {trans.dose}")
                is_consistent = False
            if orig.unit != trans.unit:
                issues.append(f"Unit altered during translation for {orig.name}: {orig.unit} vs {trans.unit}")
                is_consistent = False

        # Check follow-up dates
        orig_dates = [f.date for f in original_plan.follow_ups if f.date]
        trans_dates = [f.date for f in translated_plan.follow_ups if f.date]
        if orig_dates != trans_dates:
            issues.append("Follow-up appointment dates differ across translations.")
            is_consistent = False

        return {
            "is_consistent": is_consistent,
            "target_language": translated_plan.language,
            "issues_count": len(issues),
            "issues": issues,
            "status": "CONSISTENT_VERIFIED" if is_consistent else "FLAGGED_TRANSLATION_MISMATCH"
        }

translation_service = TranslationService()
