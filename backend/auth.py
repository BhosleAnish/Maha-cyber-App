"""Email + password login."""
import hashlib
import hmac
import os
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from db import get_db, next_id

router = APIRouter(prefix="/api/auth", tags=["auth"])

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


# ---------- schemas ----------
class RegisterIn(BaseModel):
    name: str
    badge_number: str
    email: str
    password: str


class LoginIn(BaseModel):
    email: str
    password: str


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
    """Check email + password; returns the officer profile on success."""
    officer = db.officers.find_one({"email": _norm_email(body.email)})
    ok = verify_secret(body.password, officer["password_hash"] if officer else _DUMMY_HASH)
    if not officer or not ok:
        raise HTTPException(401, "Invalid email or password")
    return {"id": str(officer["id"]), "name": officer["name"], "email": officer["email"],
            "badge_number": officer["badge_number"]}
