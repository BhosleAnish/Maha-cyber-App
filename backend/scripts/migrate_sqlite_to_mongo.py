"""One-off: copy cases, evidence and correlations from the old SQLite file into MongoDB.
Usage: python backend/scripts/migrate_sqlite_to_mongo.py path/to/maha_cyber.db
(Officer accounts are new in this version, so there is nothing to migrate for them.)"""
import os
import sqlite3
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from db import _connect, init_db  # noqa: E402


def ts(v):
    try:
        return datetime.fromisoformat(v) if v else datetime.utcnow()
    except ValueError:
        return datetime.utcnow()


src = sqlite3.connect(sys.argv[1])
src.row_factory = sqlite3.Row
db = _connect()
init_db()
n = {"cases": 0, "evidences": 0, "correlations": 0}

for r in src.execute("SELECT * FROM cases"):
    if not db.cases.find_one({"_id": r["id"]}):
        db.cases.insert_one({"_id": r["id"], "title": r["title"], "description": r["description"],
                             "status": r["status"], "created_at": ts(r["created_at"])})
        n["cases"] += 1
for r in src.execute("SELECT * FROM evidences"):
    if not db.evidences.find_one({"id": r["id"]}):
        d = dict(r)
        db.evidences.insert_one(d)
        n["evidences"] += 1
for r in src.execute("SELECT * FROM correlations"):
    if not db.correlations.find_one({"id": r["id"]}):
        d = dict(r)
        d["created_at"] = ts(d.get("created_at"))
        db.correlations.insert_one(d)
        n["correlations"] += 1
# keep auto-increment counters ahead of migrated ids
for coll, name in (("evidences", "evidences"), ("correlations", "correlations")):
    top = db[coll].find_one(sort=[("id", -1)])
    if top:
        db.counters.update_one({"_id": name}, {"$max": {"seq": top["id"]}}, upsert=True)
print("migrated:", n)
