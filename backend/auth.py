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
from pymongo import ReturnDocument
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from db import get_db, next_id

log = logging.getLogger("auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_TTL = timedelta(minutes=5)
MAX_OTP_ATTEMPTS = 5
MIN_PASSWORD_LEN = 10
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
def register(body: RegisterIn, db: Database = Depends(get_db)):
    email = _norm_email(body.email)
    name, badge = body.name.strip(), body.badge_number.strip()
    if not name or not badge:
        raise HTTPException(400, "Name and badge number are required")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Invalid email address")
    if len(body.password) < MIN_PASSWORD_LEN:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LEN} characters")
    if db.officers.find_one({"$or": [{"email": email}, {"badge_number": badge}]}):
        raise HTTPException(409, "An account with this email or badge number already exists")
    try:
        db.officers.insert_one({
            "id": next_id(db, "officers"), "name": name, "badge_number": badge, "email": email,
            "password_hash": hash_secret(body.password), "created_at": datetime.utcnow(),
        })
    except DuplicateKeyError:  # lost a race with a concurrent registration
        raise HTTPException(409, "An account with this email or badge number already exists")
    return {"message": "Account created"}


@router.post("/login")
def login(body: LoginIn, db: Database = Depends(get_db)):
    """Step 1: check password, email a one-time code, return a challenge id."""
    officer = db.officers.find_one({"email": _norm_email(body.email)})
    ok = verify_secret(body.password, officer["password_hash"] if officer else _DUMMY_HASH)
    if not officer or not ok:
        raise HTTPException(401, "Invalid email or password")

    # Invalidate earlier pending challenges for this officer
    db.login_otps.update_many({"officer_id": officer["id"], "used": False}, {"$set": {"used": True}})

    otp = f"{secrets.randbelow(10**6):06d}"
    challenge_id = secrets.token_urlsafe(24)
    db.login_otps.insert_one({
        "_id": challenge_id, "officer_id": officer["id"], "otp_hash": hash_secret(otp),
        "expires_at": datetime.utcnow() + OTP_TTL, "attempts": 0, "used": False,
        "created_at": datetime.utcnow(),
    })
    send_otp_email(officer["email"], otp)

    local, _, domain = officer["email"].partition("@")
    return {"challenge_id": challenge_id, "email_hint": f"{local[:2]}***@{domain}"}


@router.post("/verify-otp")
def verify_otp(body: VerifyIn, db: Database = Depends(get_db)):
    """Step 2: check the emailed code; returns the officer profile on success."""
    # Atomically count this attempt, only if the challenge is still usable
    ch = db.login_otps.find_one_and_update(
        {"_id": body.challenge_id, "used": False, "attempts": {"$lt": MAX_OTP_ATTEMPTS},
         "expires_at": {"$gt": datetime.utcnow()}},
        {"$inc": {"attempts": 1}},
        return_document=ReturnDocument.AFTER,
    )
    if not ch:
        raise HTTPException(401, "Code expired or invalid. Please sign in again.")
    if not verify_secret(body.otp.strip(), ch["otp_hash"]):
        raise HTTPException(401, "Incorrect code")
    # Single use: only one concurrent request can flip used False -> True
    if db.login_otps.update_one({"_id": ch["_id"], "used": False}, {"$set": {"used": True}}).modified_count != 1:
        raise HTTPException(401, "Code expired or invalid. Please sign in again.")
    officer = db.officers.find_one({"id": ch["officer_id"]})
    return {"id": str(officer["id"]), "name": officer["name"], "email": officer["email"],
            "badge_number": officer["badge_number"]}
