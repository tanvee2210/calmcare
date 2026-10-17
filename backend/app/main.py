import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.models.database import init_db
from app.config import UPLOAD_DIR
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.careplan import router as careplan_router
from app.api.verification import router as verification_router
from app.api.speech import router as speech_router
from app.api.assistant import router as assistant_router
from app.api.reminders import router as reminders_router
from app.api.caregivers import router as caregivers_router
from app.api.printable import router as printable_router
from app.api.condition import router as condition_router
from app.api.diff import router as diff_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables and indexes on startup
    init_db()
    os.makedirs(str(UPLOAD_DIR), exist_ok=True)
    yield

app = FastAPI(
    title="CalmCare API",
    description="Multilingual, voice-first, safety-verified recovery companion backend.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(careplan_router)
app.include_router(verification_router)
app.include_router(speech_router)
app.include_router(assistant_router)
app.include_router(reminders_router)
app.include_router(caregivers_router)
app.include_router(printable_router)
app.include_router(condition_router)
app.include_router(diff_router)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CalmCare Backend",
        "version": "1.0.0",
        "medical_safety_engine": "active",
        "languages_supported": ["en", "hi", "te", "ta", "mr", "bn", "kn"]
    }

# Mount static frontend build if it exists (for single-container/Render full-stack deployment)
_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "frontend", "dist")
if os.path.exists(_dist_path):
    app.mount("/", StaticFiles(directory=_dist_path, html=True), name="static_frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
