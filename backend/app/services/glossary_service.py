import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from app.config import DATA_DIR

class GlossaryService:
    def __init__(self):
        glossary_path = DATA_DIR / "medical_glossary.json"
        drug_path = DATA_DIR / "drug_reference.json"

        with open(glossary_path, "r", encoding="utf-8") as f:
            self.glossary_data = json.load(f)

        with open(drug_path, "r", encoding="utf-8") as f:
            self.drug_data = json.load(f)

        self.abbreviations = self.glossary_data.get("abbreviations", {})
        self.clinical_terms = self.glossary_data.get("clinical_terms_plain_language", {})
        self.drugs = self.drug_data.get("drugs", [])

    def expand_abbreviation(self, abbr: str) -> Optional[Dict[str, str]]:
        clean_abbr = abbr.strip().upper().replace(".", "")
        return self.abbreviations.get(clean_abbr)

    def explain_clinical_term(self, term: str) -> Optional[str]:
        term_lower = term.strip().lower()
        for k, v in self.clinical_terms.items():
            if k in term_lower or term_lower in k:
                return v
        return None

    def match_drug_reference(self, text: str) -> Optional[Dict[str, Any]]:
        text_lower = text.lower()
        for drug in self.drugs:
            if drug["generic"].lower() in text_lower:
                return drug
            for brand in drug.get("common_brands", []):
                if brand.lower() in text_lower:
                    return drug
        return None

    def calculate_readability(self, text: str) -> Dict[str, Any]:
        """
        Calculates Flesch-Kincaid Grade Level and reading ease.
        Target: Class 8 (grade 7-8).
        """
        words = re.findall(r'\b[A-Za-z0-9\'-]+\b', text)
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]

        total_words = len(words)
        total_sentences = max(len(sentences), 1)

        if total_words == 0:
            return {
                "flesch_kincaid_grade": 8.0,
                "reading_ease": 70.0,
                "grade_label": "Class 8 (Target Accessible)"
            }

        # Estimate syllables
        def count_syllables(word: str) -> int:
            word = word.lower()
            if len(word) <= 3:
                return 1
            vowels = "aeiouy"
            count = 0
            prev_is_vowel = False
            for char in word:
                is_vowel = char in vowels
                if is_vowel and not prev_is_vowel:
                    count += 1
                prev_is_vowel = is_vowel
            if word.endswith("e") and not word.endswith("le"):
                count = max(count - 1, 1)
            return max(count, 1)

        total_syllables = sum(count_syllables(w) for w in words)

        # Flesch-Kincaid Grade Level formula
        # 0.39 * (total_words / total_sentences) + 11.8 * (total_syllables / total_words) - 15.59
        fk_grade = (0.39 * (total_words / total_sentences)) + (11.8 * (total_syllables / total_words)) - 15.59
        fk_grade = round(max(1.0, min(16.0, fk_grade)), 1)

        if fk_grade <= 6:
            label = "Class 5-6 (Very Easy / Low Literacy)"
        elif fk_grade <= 8:
            label = "Class 7-8 (Accessible / Target Grade)"
        elif fk_grade <= 10:
            label = "Class 9-10 (Standard)"
        else:
            label = "Class 11+ (Complex Medical Prose)"

        return {
            "flesch_kincaid_grade": fk_grade,
            "word_count": total_words,
            "sentence_count": total_sentences,
            "grade_label": label
        }

glossary_service = GlossaryService()
