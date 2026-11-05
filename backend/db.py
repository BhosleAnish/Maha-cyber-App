"""MongoDB connection and helpers.

MONGODB_URI   connection string (MongoDB Atlas "mongodb+srv://..." in production)
MONGODB_DB    database name (default: maha_cyber)
MONGODB_URI=mongomock://  in-memory fake database for local tests only (needs `pip install mongomock`)
"""
import os

from pymongo import ASCENDING, MongoClient, ReturnDocument
from pymongo.database import Database

_client = None
_db: Database | None = None


def _connect() -> Database:
    global _client, _db
    if _db is not None:
        return _db
    uri = os.getenv("MONGODB_URI", "").strip()
    if not uri:
        raise RuntimeError("MONGODB_URI is not set. Add your MongoDB Atlas connection string to backend/.env")
    if uri.startswith("mongomock://"):
        import mongomock
        _client = mongomock.MongoClient()
    else:
        _client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    _db = _client[os.getenv("MONGODB_DB", "maha_cyber")]
    return _db


def get_db() -> Database:
    """FastAPI dependency."""
    return _connect()


def init_db() -> None:
    """Create indexes (idempotent)."""
    db = _connect()
    db.officers.create_index("email", unique=True)
    db.officers.create_index("badge_number", unique=True)
    db.evidences.create_index([("case_id", ASCENDING), ("id", ASCENDING)])
    db.correlations.create_index([("case_id", ASCENDING), ("id", ASCENDING)])
    db.login_otps.create_index("officer_id")
    # Mongo deletes expired OTP challenges automatically
    db.login_otps.create_index("expires_at", expireAfterSeconds=0)


def next_id(db: Database, name: str) -> int:
    """Auto-incrementing integer ids (keeps the EVD-1, EVD-2 ... numbering the UI expects)."""
    doc = db.counters.find_one_and_update(
        {"_id": name}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return doc["seq"]
