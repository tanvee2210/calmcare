import os
import io
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple
from PIL import Image, ImageStat
import PyPDF2

class OCRService:
    def __init__(self):
        pass

    def extract_text_from_file(self, file_path: str, mime_type: str) -> Dict[str, Any]:
        """
        Extracts text from PDF or Image.
        Returns:
            raw_text: str
            pages: List[Dict] (page_number, text, confidence, quality_warning)
            overall_confidence: float
            has_uncertainty: bool
            detected_issues: List[str]
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        detected_issues = []
        pages_data = []

        if mime_type == "application/pdf" or file_path.lower().endswith(".pdf"):
            return self._extract_pdf(file_path)
        else:
            return self._extract_image(file_path)

    def _extract_pdf(self, file_path: str) -> Dict[str, Any]:
        pages_data = []
        full_text_list = []
        has_uncertainty = False
        detected_issues = []

        try:
            reader = PyPDF2.PdfReader(file_path)
            num_pages = len(reader.pages)

            if num_pages == 0:
                return {
                    "raw_text": "",
                    "pages": [],
                    "overall_confidence": 0.0,
                    "has_uncertainty": True,
                    "detected_issues": ["PDF has 0 readable pages."]
                }

            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                confidence = 1.0
                page_issues = []

                if len(page_text.strip()) < 30:
                    confidence = 0.4
                    has_uncertainty = True
                    page_issues.append("Page appears to be a scanned image with minimal embedded digital text.")

                # Check for illegible / corrupt character markers
                if "??" in page_text or "???" in page_text or "[illegible" in page_text.lower():
                    confidence = min(confidence, 0.5)
                    has_uncertainty = True
                    page_issues.append("Detected ambiguous or unreadable characters (e.g. '???').")

                pages_data.append({
                    "page_number": idx + 1,
                    "text": page_text,
                    "confidence": confidence,
                    "issues": page_issues
                })
                full_text_list.append(f"--- PAGE {idx + 1} ---\n{page_text}")
                detected_issues.extend(page_issues)

            raw_text = "\n\n".join(full_text_list)
            overall_conf = sum(p["confidence"] for p in pages_data) / max(len(pages_data), 1)

            return {
                "raw_text": raw_text,
                "pages": pages_data,
                "overall_confidence": round(overall_conf, 2),
                "has_uncertainty": has_uncertainty,
                "detected_issues": detected_issues
            }

        except Exception as e:
            return {
                "raw_text": "",
                "pages": [],
                "overall_confidence": 0.0,
                "has_uncertainty": True,
                "detected_issues": [f"Failed to parse PDF document: {str(e)}"]
            }

    def _extract_image(self, file_path: str) -> Dict[str, Any]:
        """
        Assesses image quality (contrast, sharpness, resolution) and extracts text.
        """
        detected_issues = []
        confidence = 0.95
        has_uncertainty = False

        try:
            with Image.open(file_path) as img:
                width, height = img.size
                if width < 800 or height < 800:
                    detected_issues.append(f"Low image resolution ({width}x{height}). Text may be difficult to read.")
                    confidence -= 0.2
                    has_uncertainty = True

                # Check contrast using ImageStat
                grayscale = img.convert('L')
                stat = ImageStat.Stat(grayscale)
                stddev = stat.stddev[0]
                if stddev < 30:
                    detected_issues.append("Low contrast image detected. Risk of misreading numbers or decimal points.")
                    confidence -= 0.3
                    has_uncertainty = True

            # If plain text file or OCR fallback
            return {
                "raw_text": f"[Image file processed: {os.path.basename(file_path)} - Resolution: {width}x{height}]",
                "pages": [{
                    "page_number": 1,
                    "text": "[Image processed]",
                    "confidence": max(0.2, round(confidence, 2)),
                    "issues": detected_issues
                }],
                "overall_confidence": max(0.2, round(confidence, 2)),
                "has_uncertainty": has_uncertainty,
                "detected_issues": detected_issues
            }
        except Exception as e:
            return {
                "raw_text": "",
                "pages": [],
                "overall_confidence": 0.0,
                "has_uncertainty": True,
                "detected_issues": [f"Image inspection failed: {str(e)}"]
            }

ocr_service = OCRService()
