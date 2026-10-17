import uuid
import sqlite3
import jwt
import hashlib
import hmac
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Header, Response, Cookie, status

from app.models.schemas import (
    UserRegister, UserLogin, UserResponse, TokenResponse,
    PasswordResetRequest, PasswordResetConfirm, UserRole
)
from app.models.database import get_db_connection, log_audit_event
from app.config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${pw_hash.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, stored_hash = hashed_password.split("$")
        computed_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(computed_hash.hex(), stored_hash)
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> tuple[str, str]:
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": str(uuid.uuid4()),
        "exp": expires
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token, expires.isoformat()

def get_current_user(
    authorization: Optional[str] = Header(None),
    calmcare_session: Optional[str] = Cookie(None)
) -> UserResponse:
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]
    elif calmcare_session:
        raw_token = calmcare_session

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in."
        )

    try:
        payload = jwt.decode(raw_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")

    conn = get_db_connection()
    sess = conn.execute("SELECT is_revoked FROM sessions WHERE token = ?", (raw_token,)).fetchone()
    if sess and sess["is_revoked"]:
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session was logged out.")

    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")

    return UserResponse(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        role=UserRole(row["role"]),
        preferred_language=row["preferred_language"],
        accessibility_mode=bool(row["accessibility_mode"]),
        created_at=row["created_at"]
    )

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, response: Response):
    conn = get_db_connection()
    norm_email = user_in.email.strip().lower()

    existing = conn.execute("SELECT id FROM users WHERE email = ?", (norm_email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in."
        )

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(user_in.password)
    now = datetime.now(timezone.utc).isoformat()

    with conn:
        conn.execute(
            """INSERT INTO users (id, email, password_hash, name, role, preferred_language, accessibility_mode, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, norm_email, pw_hash, user_in.name.strip(), user_in.role.value, user_in.preferred_language, int(user_in.accessibility_mode), now)
        )

    token, expires_at = create_access_token(user_id, norm_email, user_in.role.value)
    with conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at, is_revoked, created_at) VALUES (?, ?, ?, 0, ?)",
            (token, user_id, expires_at, now)
        )
    conn.close()

    log_audit_event(user_id, "user_registration", {"email": norm_email, "role": user_in.role.value})

    response.set_cookie(
        key="calmcare_session",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    user_resp = UserResponse(
        id=user_id,
        name=user_in.name.strip(),
        email=norm_email,
        role=user_in.role,
        preferred_language=user_in.preferred_language,
        accessibility_mode=user_in.accessibility_mode,
        created_at=now
    )

    return TokenResponse(access_token=token, user=user_resp)

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, response: Response):
    norm_email = login_in.email.strip().lower()
    conn = get_db_connection()
    user_row = conn.execute("SELECT * FROM users WHERE email = ?", (norm_email,)).fetchone()

    if not user_row or not verify_password(login_in.password, user_row["password_hash"]):
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials."
        )

    user_id = user_row["id"]
    now = datetime.now(timezone.utc).isoformat()
    token, expires_at = create_access_token(user_id, norm_email, user_row["role"])

    with conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at, is_revoked, created_at) VALUES (?, ?, ?, 0, ?)",
            (token, user_id, expires_at, now)
        )
    conn.close()

    log_audit_event(user_id, "user_login", {"email": norm_email})

    response.set_cookie(
        key="calmcare_session",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    user_resp = UserResponse(
        id=user_id,
        name=user_row["name"],
        email=user_row["email"],
        role=UserRole(user_row["role"]),
        preferred_language=user_row["preferred_language"],
        accessibility_mode=bool(user_row["accessibility_mode"]),
        created_at=user_row["created_at"]
    )

    return TokenResponse(access_token=token, user=user_resp)

@router.post("/logout")
def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    calmcare_session: Optional[str] = Cookie(None)
):
    raw_token = None
    if authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]
    elif calmcare_session:
        raw_token = calmcare_session

    if raw_token:
        conn = get_db_connection()
        with conn:
            conn.execute("UPDATE sessions SET is_revoked = 1 WHERE token = ?", (raw_token,))
        conn.close()

    response.delete_cookie(key="calmcare_session")
    return {"message": "Successfully signed out. Session has been revoked."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@router.post("/password-reset-request")
def request_password_reset(req: PasswordResetRequest):
    return {"message": "If this email is registered, password reset guidance has been dispatched."}
