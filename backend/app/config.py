import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = PROJECT_ROOT / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Security Configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "calmcare-super-secure-production-secret-key-391823901")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

# Supported Languages in CalmCare
SUPPORTED_LANGUAGES = {
    "en": {"name": "English", "native": "English", "flag": "🇬🇧", "voice_code": "en-IN"},
    "hi": {"name": "Hindi", "native": "हिन्दी", "flag": "🇮🇳", "voice_code": "hi-IN"},
    "te": {"name": "Telugu", "native": "తెలుగు", "flag": "🇮🇳", "voice_code": "te-IN"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "flag": "🇮🇳", "voice_code": "ta-IN"},
    "mr": {"name": "Marathi", "native": "मराठी", "flag": "🇮🇳", "voice_code": "mr-IN"},
    "bn": {"name": "Bengali", "native": "বাংলা", "flag": "🇮🇳", "voice_code": "bn-IN"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "flag": "🇮🇳", "voice_code": "kn-IN"}
}

# AI Provider Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

# Clinical Safety Boundaries
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 # 25 MB
ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"]
READING_LEVEL_TARGET_GRADE = 8.0 # Class 8 reading difficulty
