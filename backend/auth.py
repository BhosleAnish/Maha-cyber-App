"""Email + password login with emailed one-time code (MFA)."""
import hashlib
import hmac
import logging
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import Officer, LoginOtp

log = logging.getLogger("auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_TTL = timedelta(minutes=5)
MAX_OTP_ATTEMPTS = 5
MIN_PASSWORD_LEN = 10
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def get_db():
    # Imported lazily to avoid a circular import with main.py
    from main import get_db as _get_db
    yield from _get_db()


# ---------- hashing (stdlib scrypt, no extra dependency) ----------
def hash_secret(value: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    dk = hashlib.scrypt(value.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return f"{salt.hex()}${dk.hex()}"


def verify_secret(value: str, stored: str) -> bool:
    try:
        salt_hex, _ = stored.split("$", 1)
        return hmac.compare_digest(hash_secret(value, bytes.fromhex(salt_hex)), stored)
    except ValueError:
        return False


# A real hash to compare against when the email is unknown, so login timing
# doesn't reveal which emails are registered.
_DUMMY_HASH = hash_secret("dummy-password-for-timing")


# ---------- email delivery ----------
def send_otp_email(to_addr: str, otp: str) -> None:
    host = os.getenv("SMTP_HOST", "")
    if not host:
        if os.getenv("OTP_CONSOLE_FALLBACK", "").lower() == "true":
            log.warning("SMTP not configured; DEV OTP for %s: %s", to_addr, otp)
            return
        raise HTTPException(status_code=503, detail="Email service is not configured")

    msg = EmailMessage()
    msg["Subject"] = "Maha Cyber login verification code"
    msg["From"] = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "no-reply@localhost"))
    msg["To"] = to_addr
    msg.set_content(
        f"Your Maha Cyber verification code is: {otp}\n\n"
        "It expires in 5 minutes. If you did not try to sign in, change your password "
        "and contact your administrator."
    )
    port = int(os.getenv("SMTP_PORT", "587"))
    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.starttls()
        with server:
            user = os.getenv("SMTP_USER", "")
            if user:
                server.login(user, os.getenv("SMTP_PASSWORD", ""))
            server.send_message(msg)
    except (smtplib.SMTPException, OSError):
        log.exception("Failed to send OTP email")
        raise HTTPException(status_code=502, detail="Could not send verification email")


# ---------- schemas ----------
class RegisterIn(BaseModel):
    name: str
    badge_number: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


class VerifyIn(BaseModel):
    challenge_id: str
    otp: str


def _norm_email(e: str) -> str:
    return e.strip().lower()


# ---------- endpoints ----------
@router.post("/register")
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = _norm_email(body.email)
    name, badge = body.name.strip(), body.badge_number.strip()
    if not name or not badge:
        raise HTTPException(400, "Name and badge number are required")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email address")
    if len(body.password) < MIN_PASSWORD_LEN:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LEN} characters")
    if db.query(Officer).filter((Officer.email == email) | (Officer.badge_number == badge)).first():
        raise HTTPException(409, "An account with this email or badge number already exists")
    db.add(Officer(name=name, badge_number=badge, email=email, password_hash=hash_secret(body.password)))
    db.commit()
    return {"message": "Account created"}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    """Step 1: check password, email a one-time code, return a challenge id."""
    officer = db.query(Officer).filter(Officer.email == _norm_email(body.email)).first()
    ok = verify_secret(body.password, officer.password_hash if officer else _DUMMY_HASH)
    if not officer or not ok:
        raise HTTPException(401, "Invalid email or password")

    # Invalidate earlier pending challenges for this officer
    db.query(LoginOtp).filter(LoginOtp.officer_id == officer.id, LoginOtp.used == 0).update({"used": 1})

    otp = f"{secrets.randbelow(10**6):06d}"
    challenge_id = secrets.token_urlsafe(24)
    db.add(LoginOtp(id=challenge_id, officer_id=officer.id, otp_hash=hash_secret(otp),
                    expires_at=datetime.utcnow() + OTP_TTL))
    db.commit()
    send_otp_email(officer.email, otp)

    local, _, domain = officer.email.partition("@")
    return {"challenge_id": challenge_id, "email_hint": f"{local[:2]}***@{domain}"}


@router.post("/verify-otp")
def verify_otp(body: VerifyIn, db: Session = Depends(get_db)):
    """Step 2: check the emailed code; returns the officer profile on success."""
    ch = db.query(LoginOtp).filter(LoginOtp.id == body.challenge_id).first()
    if not ch or ch.used or ch.expires_at < datetime.utcnow() or ch.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(401, "Code expired or invalid. Please sign in again.")
    ch.attempts += 1
    if not verify_secret(body.otp.strip(), ch.otp_hash):
        db.commit()
        raise HTTPException(401, "Incorrect code")
    ch.used = 1
    db.commit()
    officer = db.query(Officer).filter(Officer.id == ch.officer_id).first()
    return {"id": str(officer.id), "name": officer.name, "email": officer.email,
            "badge_number": officer.badge_number}
