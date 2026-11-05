from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn
import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

from pymongo.database import Database
from fastapi.concurrency import run_in_threadpool
from db import get_db, init_db, next_id
from auth import router as auth_router

init_db()

app = FastAPI(title="Maha Cyber API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    # Comma-separated list in CORS_ORIGINS; the deployed frontend proxies via /backend so "*" is only a default
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# --- Pydantic Schemas (For API Validation) ---
class CaseCreate(BaseModel):
    id: str
    title: str
    description: str
    status: str = "Investigation Pending"
    # Case identity
    firNumber: Optional[str] = None
    caseType: Optional[str] = None
    priority: Optional[str] = "Medium"
    # Ownership
    officerName: Optional[str] = None
    officerRank: Optional[str] = None
    officerBadgeId: Optional[str] = None
    officerContact: Optional[str] = None
    supervisingOfficer: Optional[str] = None
    # Jurisdiction
    policeStation: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = "Maharashtra"
    court: Optional[str] = None
    # Incident
    incidentDate: Optional[str] = None
    reportedDate: Optional[str] = None
    complainant: Optional[str] = None
    suspects: Optional[str] = None
    estimatedLoss: Optional[str] = None
    legalSections: Optional[str] = None

CASE_FIELDS = [f for f in CaseCreate.model_fields if f != "id"]

class CustodyTransfer(BaseModel):
    fromPerson: str = ""
    toPerson: str = ""
    date: str = ""
    purpose: str = ""

class EvidenceCreate(BaseModel):
    category: str
    collectedDate: str
    collectedFrom: str
    location: str
    documentName: Optional[str] = None
    deviceType: Optional[str] = None
    identifyingInfo: Optional[str] = None
    # Identification
    itemDescription: Optional[str] = None
    exhibitNumber: Optional[str] = None
    makeModel: Optional[str] = None
    priority: Optional[str] = "medium"
    # Seizure
    seizureMemoNumber: Optional[str] = None
    witnesses: Optional[str] = None
    # Collected by
    collectedByName: Optional[str] = None
    collectedByRank: Optional[str] = None
    collectedByBadge: Optional[str] = None
    collectedByUnit: Optional[str] = None
    # Forensic handling
    examiner: Optional[str] = None
    examinerRank: Optional[str] = None
    examinerLab: Optional[str] = None
    examinationDate: Optional[str] = None
    toolsUsed: Optional[str] = None
    examinationMethod: Optional[str] = None
    findings: Optional[str] = None
    # Chain of custody
    chainOfCustodyNumber: Optional[str] = None
    currentCustodian: Optional[str] = None
    storageLocation: Optional[str] = None
    custodyTransfers: List[CustodyTransfer] = []
    # Integrity
    hashMD5: Optional[str] = None
    hashSHA256: Optional[str] = None
    condition: Optional[str] = None
    sealed: Optional[bool] = False
    sealNumber: Optional[str] = None
    # Tags & notes
    tags: List[str] = []
    notes: Optional[str] = None
    filesCount: int = 0

EVIDENCE_FIELDS = [f for f in EvidenceCreate.model_fields if f != "category"]

class CorrelationCreate(BaseModel):
    from_evidence: str  # Changed from 'from' to 'from_evidence' to avoid Python keyword
    to_evidence: str    # Changed from 'to' to 'to_evidence' to avoid Python keyword
    relationshipType: str
    description: Optional[str] = None

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Maharashtra Cyber Portal API", "status": "running"}

@app.post("/api/cases")
def create_case(case: CaseCreate, db: Database = Depends(get_db)):
    """Create a new case"""
    if db.cases.find_one({"_id": case.id}):
        raise HTTPException(status_code=400, detail="Case ID already exists")
    db.cases.insert_one({
        "_id": case.id,
        "title": case.title,
        "description": case.description,
        "status": case.status,
        **{f: getattr(case, f) for f in CASE_FIELDS if f not in ("title", "description", "status")},
        "created_at": datetime.utcnow(),
    })
    return {"message": "Case created successfully", "id": case.id}

@app.get("/api/cases")
def get_all_cases(db: Database = Depends(get_db)):
    """Get all cases with their evidence count"""
    counts = {r["_id"]: r["n"] for r in db.evidences.aggregate([{"$group": {"_id": "$case_id", "n": {"$sum": 1}}}])}
    return [{
        "id": c["_id"],
        "title": c.get("title"),
        "description": c.get("description"),
        "status": c.get("status"),
        "lastUpdated": c["created_at"].strftime("%Y-%m-%d"),
        "itemsCount": counts.get(c["_id"], 0),
        **{f: c.get(f) for f in ("firNumber", "caseType", "priority", "officerName", "officerRank", "policeStation", "district")},
    } for c in db.cases.find()]

@app.get("/api/cases/{case_id}")
def get_case_details(case_id: str, db: Database = Depends(get_db)):
    """Get detailed information about a specific case"""
    case = db.cases.find_one({"_id": case_id})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return {
        "id": case["_id"],
        "title": case.get("title"),
        "description": case.get("description"),
        "status": case.get("status"),
        "created_at": case["created_at"].strftime("%Y-%m-%d %H:%M:%S"),
        "evidence_count": db.evidences.count_documents({"case_id": case_id}),
        **{f: case.get(f) for f in CASE_FIELDS if f not in ("title", "description", "status")},
    }

@app.post("/api/cases/{case_id}/evidence")
def add_evidence(case_id: str, ev: EvidenceCreate, db: Database = Depends(get_db)):
    """Add evidence to a specific case"""
    if not db.cases.find_one({"_id": case_id}):
        raise HTTPException(status_code=404, detail="Case not found")
    evidence_id = next_id(db, "evidences")
    db.evidences.insert_one({
        "id": evidence_id,
        "case_id": case_id,
        "category": ev.category,
        **ev.model_dump(exclude={"category"}),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    })
    return {"status": "success", "evidence_id": evidence_id}

@app.get("/api/cases/{case_id}/evidence")
def get_case_evidence(case_id: str, db: Database = Depends(get_db)):
    """Get all evidence for a specific case"""
    if not db.cases.find_one({"_id": case_id}):
        raise HTTPException(status_code=404, detail="Case not found")
    # Format it exactly as the React frontend expects
    return [{
        "id": f"EVD-{e['id']}",
        "category": e.get("category"),
        "timestamp": e.get("timestamp"),
        **{f: e.get(f) for f in EVIDENCE_FIELDS},
    } for e in db.evidences.find({"case_id": case_id}).sort("id", -1)]

# --- CORRELATION ENDPOINTS ---

@app.post("/api/cases/{case_id}/correlations")
def add_correlation(case_id: str, corr: CorrelationCreate, db: Database = Depends(get_db)):
    """Add a correlation between two evidence items"""
    if not db.cases.find_one({"_id": case_id}):
        raise HTTPException(status_code=404, detail="Case not found")
    correlation_id = next_id(db, "correlations")
    db.correlations.insert_one({
        "id": correlation_id,
        "case_id": case_id,
        "from_evidence": corr.from_evidence,
        "to_evidence": corr.to_evidence,
        "relationshipType": corr.relationshipType,
        "description": corr.description,
        "created_at": datetime.now(),
    })
    return {
        "status": "success",
        "correlation_id": correlation_id,
        "message": "Correlation added successfully"
    }

@app.get("/api/cases/{case_id}/correlations")
def get_case_correlations(case_id: str, db: Database = Depends(get_db)):
    """Get all correlations for a specific case"""
    if not db.cases.find_one({"_id": case_id}):
        raise HTTPException(status_code=404, detail="Case not found")
    # Format for frontend (convert from_evidence/to_evidence back to from/to)
    return [{
        "id": c["id"],
        "from": c["from_evidence"],
        "to": c["to_evidence"],
        "relationshipType": c.get("relationshipType"),
        "description": c.get("description"),
        "created_at": c["created_at"].strftime("%Y-%m-%d %H:%M:%S"),
    } for c in db.correlations.find({"case_id": case_id}).sort("created_at", -1)]

@app.delete("/api/cases/{case_id}/correlations/{correlation_id}")
def delete_correlation(case_id: str, correlation_id: int, db: Database = Depends(get_db)):
    """Delete a specific correlation"""
    res = db.correlations.delete_one({"id": correlation_id, "case_id": case_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Correlation not found")
    return {"message": "Correlation deleted successfully"}

# --- END CORRELATION ENDPOINTS ---

# --- AI CORRELATION (Groq) ---

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
ALLOWED_REL_TYPES = ["Related to", "Found with", "Mentions", "Accessed by", "Contains", "References",
                     "Connected to", "Transferred data to", "Shared location with"]

@app.post("/api/cases/{case_id}/ai-correlate")
async def ai_correlate(case_id: str, db: Database = Depends(get_db)):
    """Ask Groq to suggest correlations between the case's evidence. Suggestions are NOT saved;
    the officer reviews and accepts each one via the normal correlations endpoint."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured on the server")

    def load():
        case = db.cases.find_one({"_id": case_id})
        evidence = list(db.evidences.find({"case_id": case_id}).sort("id", 1))
        existing = list(db.correlations.find({"case_id": case_id}))
        return case, evidence, existing

    case, evidence, existing = await run_in_threadpool(load)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    if len(evidence) < 2:
        raise HTTPException(status_code=400, detail="At least 2 evidence items are needed")
    valid_ids = {f"EVD-{e['id']}" for e in evidence}
    existing_pairs = {frozenset((c["from_evidence"], c["to_evidence"])) for c in existing}

    items = [{
        "id": f"EVD-{e['id']}", "category": e.get("category"), "collected_date": e.get("collectedDate"),
        "collected_from": e.get("collectedFrom"), "location": e.get("location"), "document_name": e.get("documentName"),
        "device_type": e.get("deviceType"), "identifying_info": e.get("identifyingInfo"), "logged_at": e.get("timestamp"),
    } for e in evidence]

    system = (
        "You are a digital-forensics analyst assisting an Indian cybercrime investigation. "
        "Given a case and its evidence items, find meaningful links between pairs of evidence "
        "(shared person/collection source, same location, overlapping dates, matching device or "
        "identifiers such as IMEI/phone/account/IP, document-to-device relationships). "
        "Only report links supported by the data provided; never invent facts. "
        'Respond with JSON only: {"suggestions":[{"from":"EVD-1","to":"EVD-2","relationshipType":"...",'
        '"description":"one or two sentences citing the matching fields","confidence":0.0-1.0}]}. '
        f"relationshipType must be one of: {ALLOWED_REL_TYPES}. Use only the given evidence ids. "
        "Return at most 15 suggestions, strongest first."
    )
    user = json.dumps({"case": {"id": case["_id"], "title": case.get("title"), "description": case.get("description")},
                       "evidence": items}, default=str)

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            r = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                    "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.2,
                },
            )
        r.raise_for_status()
        raw = json.loads(r.json()["choices"][0]["message"]["content"])
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error ({e.response.status_code})")
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(status_code=502, detail="AI service unavailable or returned invalid output")

    suggestions = []
    for s in raw.get("suggestions", []) if isinstance(raw, dict) else []:
        if not isinstance(s, dict):
            continue
        a, b = s.get("from"), s.get("to")
        if a not in valid_ids or b not in valid_ids or a == b:
            continue
        if frozenset((a, b)) in existing_pairs:
            continue
        rel = s.get("relationshipType")
        try:
            conf = max(0.0, min(1.0, float(s.get("confidence", 0.5))))
        except (TypeError, ValueError):
            conf = 0.5
        suggestions.append({
            "from": a, "to": b,
            "relationshipType": rel if rel in ALLOWED_REL_TYPES else "Related to",
            "description": str(s.get("description", ""))[:500],
            "confidence": conf,
        })
        existing_pairs.add(frozenset((a, b)))
    return {"suggestions": suggestions}

# --- END AI CORRELATION ---

@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str, db: Database = Depends(get_db)):
    """Delete a case and all its evidence"""
    if db.cases.delete_one({"_id": case_id}).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case not found")
    db.evidences.delete_many({"case_id": case_id})
    db.correlations.delete_many({"case_id": case_id})
    return {"message": "Case deleted successfully"}

@app.get("/api/news/cyber")
async def get_cyber_news():
    """
    Fetch live cyber security news from NewsAPI
    You need to sign up at https://newsapi.org/ and get a free API key
    Set the API key as environment variable: NEWS_API_KEY
    """
    NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
    
    if not NEWS_API_KEY:
        # Return fallback cyber security RSS if no API key
        return [
            {
                "title": "India Strengthens Cyber Security Framework Amid Rising Threats",
                "url": "https://www.cybersecurityintelligence.com",
                "source": "Cyber Intelligence",
                "publishedAt": datetime.now().isoformat()
            },
            {
                "title": "Maharashtra Police Bust Major Ransomware Operation",
                "url": "https://www.indianexpress.com",
                "source": "Indian Express",
                "publishedAt": datetime.now().isoformat()
            },
            {
                "title": "New Digital Arrest Scam Targets Senior Citizens",
                "url": "https://timesofindia.indiatimes.com",
                "source": "Times of India",
                "publishedAt": datetime.now().isoformat()
            }
        ]
    
    try:
        async with httpx.AsyncClient() as client:
            # Search for cyber security news in India
            response = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": "cybercrime OR cyber security OR hacking",
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 10
                },
                headers={"Authorization": f"Bearer {NEWS_API_KEY}"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                articles = data.get("articles", [])
                
                return [
                    {
                        "title": article["title"],
                        "url": article["url"],
                        "source": article["source"]["name"],
                        "publishedAt": article["publishedAt"]
                    }
                    for article in articles[:10]
                ]
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch news")
                
    except Exception as e:
        print(f"News API Error: {e}")
        # Return fallback news on error
        return [
            {
                "title": "Unable to fetch live news - Check API configuration",
                "url": "#",
                "source": "System",
                "publishedAt": datetime.now().isoformat()
            }
        ]

# --- IPC TO BNS MAPPER ENDPOINTS ---

IPC_TO_BNS_DATABASE = {
    "121": {"bns": "147", "title": "Waging war against Government of India", "definition": "IPC Section 121 (Waging war against Government of India) corresponds to BNS Section 147. Definition unchanged, enhanced punishment.", "status": "mapped"},
    "121A": {"bns": "148", "title": "Conspiracy to wage war", "definition": "IPC Section 121A (Conspiracy to wage war) corresponds to BNS Section 148. Enhanced punishment provisions.", "status": "mapped"},
    "122": {"bns": "149", "title": "Collecting arms to wage war", "definition": "IPC Section 122 (Collecting arms to wage war) corresponds to BNS Section 149. Updated provisions.", "status": "mapped"},
    "123": {"bns": "150", "title": "Concealing design to wage war", "definition": "IPC Section 123 (Concealing design to wage war) corresponds to BNS Section 150. Updated provisions.", "status": "mapped"},
    "124": {"bns": "151", "title": "Assaulting President or Governor", "definition": "IPC Section 124 (Assaulting President or Governor) corresponds to BNS Section 151. Updated provisions.", "status": "mapped"},
    "124A": {"bns": "152", "title": "Sedition (now Act endangering sovereignty)", "definition": "IPC Section 124A (Sedition (now Act endangering sovereignty)) corresponds to BNS Section 152. Reformulated as 'Act endangering sovereignty, unity and integrity'.", "status": "modified"},
    "125": {"bns": "153", "title": "Waging war against foreign State at peace", "definition": "IPC Section 125 (Waging war against foreign State at peace) corresponds to BNS Section 153. Updated provisions.", "status": "mapped"},
    "126": {"bns": "154", "title": "Committing depredation on foreign State", "definition": "IPC Section 126 (Committing depredation on foreign State) corresponds to BNS Section 154. Updated provisions.", "status": "mapped"},
    "127": {"bns": "155", "title": "Receiving property taken by war", "definition": "IPC Section 127 (Receiving property taken by war) corresponds to BNS Section 155. Updated provisions.", "status": "mapped"},
    "128": {"bns": "156", "title": "Public servant allowing prisoner of war to escape", "definition": "IPC Section 128 (Public servant allowing prisoner of war to escape) corresponds to BNS Section 156. Enhanced punishment.", "status": "mapped"},
    "129": {"bns": "157", "title": "Negligently suffering prisoner of war to escape", "definition": "IPC Section 129 (Negligently suffering prisoner of war to escape) corresponds to BNS Section 157. Updated provisions.", "status": "mapped"},
    "130": {"bns": "158", "title": "Aiding escape of prisoner of war", "definition": "IPC Section 130 (Aiding escape of prisoner of war) corresponds to BNS Section 158. Enhanced punishment.", "status": "mapped"},
    "141": {"bns": "189", "title": "Unlawful assembly", "definition": "IPC Section 141 (Unlawful assembly) corresponds to BNS Section 189. Definition unchanged.", "status": "mapped"},
    "142": {"bns": "189(2)", "title": "Being member of unlawful assembly", "definition": "IPC Section 142 (Being member of unlawful assembly) corresponds to BNS Section 189(2). Updated punishment.", "status": "mapped"},
    "143": {"bns": "189(3)", "title": "Punishment for unlawful assembly", "definition": "IPC Section 143 (Punishment for unlawful assembly) corresponds to BNS Section 189(3). Updated punishment.", "status": "mapped"},
    "144": {"bns": "189(4)", "title": "Joining unlawful assembly armed with deadly weapon", "definition": "IPC Section 144 (Joining unlawful assembly armed with deadly weapon) corresponds to BNS Section 189(4). Enhanced punishment.", "status": "mapped"},
    "145": {"bns": "189(5)", "title": "Joining or continuing in unlawful assembly", "definition": "IPC Section 145 (Joining or continuing in unlawful assembly) corresponds to BNS Section 189(5). Updated provisions.", "status": "mapped"},
    "146": {"bns": "190", "title": "Rioting", "definition": "IPC Section 146 (Rioting) corresponds to BNS Section 190. Definition unchanged.", "status": "mapped"},
    "147": {"bns": "191(2)", "title": "Punishment for rioting", "definition": "IPC Section 147 (Punishment for rioting) corresponds to BNS Section 191(2). Updated punishment.", "status": "mapped"},
    "148": {"bns": "191(3)", "title": "Rioting armed with deadly weapon", "definition": "IPC Section 148 (Rioting armed with deadly weapon) corresponds to BNS Section 191(3). Enhanced punishment.", "status": "mapped"},
    "149": {"bns": "190", "title": "Every member of unlawful assembly guilty", "definition": "IPC Section 149 (Every member of unlawful assembly guilty) corresponds to BNS Section 190. Principle retained.", "status": "mapped"},
    "150": {"bns": "189(6)", "title": "Hiring persons to join unlawful assembly", "definition": "IPC Section 150 (Hiring persons to join unlawful assembly) corresponds to BNS Section 189(6). Updated provisions.", "status": "mapped"},
    "151": {"bns": "189(7)", "title": "Knowingly harboring persons for unlawful assembly", "definition": "IPC Section 151 (Knowingly harboring persons for unlawful assembly) corresponds to BNS Section 189(7). Updated provisions.", "status": "mapped"},
    "152": {"bns": "189(8)", "title": "Assaulting or obstructing public servant", "definition": "IPC Section 152 (Assaulting or obstructing public servant) corresponds to BNS Section 189(8). Updated provisions.", "status": "mapped"},
    "153": {"bns": "189(9)", "title": "Wantonly giving provocation with intent to cause riot", "definition": "IPC Section 153 (Wantonly giving provocation with intent to cause riot) corresponds to BNS Section 189(9). Updated provisions.", "status": "mapped"},
    "153A": {"bns": "196", "title": "Promoting enmity between groups", "definition": "IPC Section 153A (Promoting enmity between groups) corresponds to BNS Section 196. Enhanced punishment.", "status": "mapped"},
    "153AA": {"bns": "196(2)", "title": "Promoting enmity in place of worship", "definition": "IPC Section 153AA (Promoting enmity in place of worship) corresponds to BNS Section 196(2). Specific provision added in BNS.", "status": "mapped"},
    "153B": {"bns": "197", "title": "Imputations prejudicial to national integration", "definition": "IPC Section 153B (Imputations prejudicial to national integration) corresponds to BNS Section 197. Updated provisions.", "status": "mapped"},
    "154": {"bns": "193", "title": "Owner or occupier of land on which unlawful assembly", "definition": "IPC Section 154 (Owner or occupier of land on which unlawful assembly) corresponds to BNS Section 193. Updated provisions.", "status": "mapped"},
    "155": {"bns": "195", "title": "Liability of person for whose benefit riot takes place", "definition": "IPC Section 155 (Liability of person for whose benefit riot takes place) corresponds to BNS Section 195. Updated provisions.", "status": "mapped"},
    "156": {"bns": "195", "title": "Liability of agent of owner for riot", "definition": "IPC Section 156 (Liability of agent of owner for riot) corresponds to BNS Section 195. Consolidated with 155.", "status": "mapped"},
    "157": {"bns": "195", "title": "Harbouring persons hired for unlawful assembly", "definition": "IPC Section 157 (Harbouring persons hired for unlawful assembly) corresponds to BNS Section 195. Updated provisions.", "status": "mapped"},
    "158": {"bns": "194", "title": "Being hired to take part in unlawful assembly", "definition": "IPC Section 158 (Being hired to take part in unlawful assembly) corresponds to BNS Section 194. Updated provisions.", "status": "mapped"},
    "159": {"bns": "192", "title": "Affray", "definition": "IPC Section 159 (Affray) corresponds to BNS Section 192. Updated provisions.", "status": "mapped"},
    "160": {"bns": "192", "title": "Punishment for affray", "definition": "IPC Section 160 (Punishment for affray) corresponds to BNS Section 192. Consolidated with 159.", "status": "mapped"},
    "161": {"bns": "Not directly mapped", "title": "Public servant taking gratification (Bribery)", "definition": "IPC Section 161 (Public servant taking gratification (Bribery)) is not directly mapped to BNS. Now covered under Prevention of Corruption Act, 1988.", "status": "redacted"},
    "162": {"bns": "Not directly mapped", "title": "Taking gratification to influence public servant", "definition": "IPC Section 162 (Taking gratification to influence public servant) is not directly mapped to BNS. Covered under Prevention of Corruption Act.", "status": "redacted"},
    "163": {"bns": "Not directly mapped", "title": "Taking gratification for exercise of personal influence", "definition": "IPC Section 163 (Taking gratification for exercise of personal influence) is not directly mapped to BNS. Covered under Prevention of Corruption Act.", "status": "redacted"},
    "164": {"bns": "Not directly mapped", "title": "Punishment for abetment of above offences", "definition": "IPC Section 164 (Punishment for abetment of above offences) is not directly mapped to BNS. Covered under Prevention of Corruption Act.", "status": "redacted"},
    "165": {"bns": "Not directly mapped", "title": "Public servant obtaining valuable thing", "definition": "IPC Section 165 (Public servant obtaining valuable thing) is not directly mapped to BNS. Covered under Prevention of Corruption Act.", "status": "redacted"},
    "166": {"bns": "198", "title": "Public servant disobeying law", "definition": "IPC Section 166 (Public servant disobeying law) corresponds to BNS Section 198. Updated provisions.", "status": "mapped"},
    "166A": {"bns": "199", "title": "Public servant disobeying direction under law", "definition": "IPC Section 166A (Public servant disobeying direction under law) corresponds to BNS Section 199. Enhanced for specific cases.", "status": "mapped"},
    "166B": {"bns": "200", "title": "Punishment for non-treatment of victim", "definition": "IPC Section 166B (Punishment for non-treatment of victim) corresponds to BNS Section 200. New provision for medical care.", "status": "modified"},
    "167": {"bns": "201", "title": "Public servant framing incorrect document", "definition": "IPC Section 167 (Public servant framing incorrect document) corresponds to BNS Section 201. Updated provisions.", "status": "mapped"},
    "168": {"bns": "202", "title": "Public servant unlawfully engaging in trade", "definition": "IPC Section 168 (Public servant unlawfully engaging in trade) corresponds to BNS Section 202. Community service option added.", "status": "mapped"},
    "169": {"bns": "203", "title": "Public servant unlawfully buying property", "definition": "IPC Section 169 (Public servant unlawfully buying property) corresponds to BNS Section 203. Updated provisions.", "status": "mapped"},
    "170": {"bns": "204", "title": "Personating a public servant", "definition": "IPC Section 170 (Personating a public servant) corresponds to BNS Section 204. Enhanced punishment.", "status": "mapped"},
    "171": {"bns": "205", "title": "Wearing garb of public servant with fraudulent intent", "definition": "IPC Section 171 (Wearing garb of public servant with fraudulent intent) corresponds to BNS Section 205. Updated provisions.", "status": "mapped"},
    "171A": {"bns": "169", "title": "Candidate and electoral right defined", "definition": "IPC Section 171A (Candidate and electoral right defined) corresponds to BNS Section 169. Definition retained.", "status": "mapped"},
    "171B": {"bns": "170", "title": "Bribery", "definition": "IPC Section 171B (Bribery) corresponds to BNS Section 170. Definition updated.", "status": "mapped"},
    "171C": {"bns": "171", "title": "Undue influence at elections", "definition": "IPC Section 171C (Undue influence at elections) corresponds to BNS Section 171. Updated provisions.", "status": "mapped"},
    "171D": {"bns": "172", "title": "Personation at elections", "definition": "IPC Section 171D (Personation at elections) corresponds to BNS Section 172. Updated provisions.", "status": "mapped"},
    "171E": {"bns": "173", "title": "Punishment for bribery", "definition": "IPC Section 171E (Punishment for bribery) corresponds to BNS Section 173. Updated punishment.", "status": "mapped"},
    "171F": {"bns": "174", "title": "Punishment for undue influence or personation", "definition": "IPC Section 171F (Punishment for undue influence or personation) corresponds to BNS Section 174. Updated punishment.", "status": "mapped"},
    "171G": {"bns": "175", "title": "False statement in connection with election", "definition": "IPC Section 171G (False statement in connection with election) corresponds to BNS Section 175. Updated provisions.", "status": "mapped"},
    "171H": {"bns": "176", "title": "Illegal payments in connection with election", "definition": "IPC Section 171H (Illegal payments in connection with election) corresponds to BNS Section 176. Updated provisions.", "status": "mapped"},
    "171I": {"bns": "177", "title": "Failure to keep election accounts", "definition": "IPC Section 171I (Failure to keep election accounts) corresponds to BNS Section 177. Updated provisions.", "status": "mapped"},
    "172": {"bns": "179", "title": "Absconding to avoid service of summons", "definition": "IPC Section 172 (Absconding to avoid service of summons) corresponds to BNS Section 179. Updated provisions.", "status": "mapped"},
    "173": {"bns": "180", "title": "Preventing service of summons", "definition": "IPC Section 173 (Preventing service of summons) corresponds to BNS Section 180. Updated provisions.", "status": "mapped"},
    "174": {"bns": "181", "title": "Non-attendance in obedience to order", "definition": "IPC Section 174 (Non-attendance in obedience to order) corresponds to BNS Section 181. Updated provisions.", "status": "mapped"},
    "174A": {"bns": "182", "title": "Non-appearance in response to proclamation", "definition": "IPC Section 174A (Non-appearance in response to proclamation) corresponds to BNS Section 182. Updated provisions.", "status": "mapped"},
    "175": {"bns": "183", "title": "Omission to produce document to public servant", "definition": "IPC Section 175 (Omission to produce document to public servant) corresponds to BNS Section 183. Updated provisions.", "status": "mapped"},
    "176": {"bns": "184", "title": "Omission to give notice or information", "definition": "IPC Section 176 (Omission to give notice or information) corresponds to BNS Section 184. Updated provisions.", "status": "mapped"},
    "177": {"bns": "185", "title": "Furnishing false information", "definition": "IPC Section 177 (Furnishing false information) corresponds to BNS Section 185. Updated provisions.", "status": "mapped"},
    "178": {"bns": "186", "title": "Refusing oath or affirmation", "definition": "IPC Section 178 (Refusing oath or affirmation) corresponds to BNS Section 186. Updated provisions.", "status": "mapped"},
    "179": {"bns": "187", "title": "Refusing to answer public servant", "definition": "IPC Section 179 (Refusing to answer public servant) corresponds to BNS Section 187. Updated provisions.", "status": "mapped"},
    "180": {"bns": "188", "title": "Refusing to sign statement", "definition": "IPC Section 180 (Refusing to sign statement) corresponds to BNS Section 188. Updated provisions.", "status": "mapped"},
    "181": {"bns": "213", "title": "False statement on oath to public servant", "definition": "IPC Section 181 (False statement on oath to public servant) corresponds to BNS Section 213. Repositioned in BNS.", "status": "mapped"},
    "182": {"bns": "214", "title": "False information to public servant", "definition": "IPC Section 182 (False information to public servant) corresponds to BNS Section 214. Enhanced punishment.", "status": "mapped"},
    "183": {"bns": "215", "title": "Resistance to taking of property", "definition": "IPC Section 183 (Resistance to taking of property) corresponds to BNS Section 215. Updated provisions.", "status": "mapped"},
    "184": {"bns": "216", "title": "Obstructing sale of property", "definition": "IPC Section 184 (Obstructing sale of property) corresponds to BNS Section 216. Updated provisions.", "status": "mapped"},
    "185": {"bns": "217", "title": "Illegal purchase or bid for property", "definition": "IPC Section 185 (Illegal purchase or bid for property) corresponds to BNS Section 217. Updated provisions.", "status": "mapped"},
    "186": {"bns": "218", "title": "Obstructing public servant", "definition": "IPC Section 186 (Obstructing public servant) corresponds to BNS Section 218. Updated provisions.", "status": "mapped"},
    "187": {"bns": "219", "title": "Omission to assist public servant", "definition": "IPC Section 187 (Omission to assist public servant) corresponds to BNS Section 219. Updated provisions.", "status": "mapped"},
    "188": {"bns": "220", "title": "Disobedience to order promulgated by public servant", "definition": "IPC Section 188 (Disobedience to order promulgated by public servant) corresponds to BNS Section 220. Enhanced punishment.", "status": "mapped"},
    "189": {"bns": "221", "title": "Threat of injury to public servant", "definition": "IPC Section 189 (Threat of injury to public servant) corresponds to BNS Section 221. Updated provisions.", "status": "mapped"},
    "190": {"bns": "222", "title": "Threat of injury to induce person to refrain", "definition": "IPC Section 190 (Threat of injury to induce person to refrain) corresponds to BNS Section 222. Updated provisions.", "status": "mapped"},
    "191": {"bns": "223", "title": "Giving false evidence", "definition": "IPC Section 191 (Giving false evidence) corresponds to BNS Section 223. Definition unchanged.", "status": "mapped"},
    "192": {"bns": "224", "title": "Fabricating false evidence", "definition": "IPC Section 192 (Fabricating false evidence) corresponds to BNS Section 224. Updated provisions.", "status": "mapped"},
    "193": {"bns": "225", "title": "Punishment for false evidence", "definition": "IPC Section 193 (Punishment for false evidence) corresponds to BNS Section 225. Enhanced punishment.", "status": "mapped"},
    "194": {"bns": "226", "title": "Giving or fabricating false evidence in judicial proceeding", "definition": "IPC Section 194 (Giving or fabricating false evidence in judicial proceeding) corresponds to BNS Section 226. Updated provisions.", "status": "mapped"},
    "195": {"bns": "227", "title": "Giving or fabricating false evidence to procure conviction", "definition": "IPC Section 195 (Giving or fabricating false evidence to procure conviction) corresponds to BNS Section 227. Enhanced punishment.", "status": "mapped"},
    "195A": {"bns": "228", "title": "Threatening person to give false evidence", "definition": "IPC Section 195A (Threatening person to give false evidence) corresponds to BNS Section 228. Updated provisions.", "status": "mapped"},
    "196": {"bns": "229", "title": "Using evidence known to be false", "definition": "IPC Section 196 (Using evidence known to be false) corresponds to BNS Section 229. Updated provisions.", "status": "mapped"},
    "197": {"bns": "230", "title": "Issuing or signing false certificate", "definition": "IPC Section 197 (Issuing or signing false certificate) corresponds to BNS Section 230. Updated provisions.", "status": "mapped"},
    "198": {"bns": "231", "title": "Using as true a certificate known to be false", "definition": "IPC Section 198 (Using as true a certificate known to be false) corresponds to BNS Section 231. Updated provisions.", "status": "mapped"},
    "199": {"bns": "232", "title": "False statement made in declaration", "definition": "IPC Section 199 (False statement made in declaration) corresponds to BNS Section 232. Updated provisions.", "status": "mapped"},
    "200": {"bns": "233", "title": "Using as true such declaration", "definition": "IPC Section 200 (Using as true such declaration) corresponds to BNS Section 233. Updated provisions.", "status": "mapped"},
    "201": {"bns": "234", "title": "Causing disappearance of evidence", "definition": "IPC Section 201 (Causing disappearance of evidence) corresponds to BNS Section 234. Enhanced punishment.", "status": "mapped"},
    "202": {"bns": "235", "title": "Intentional omission to give information", "definition": "IPC Section 202 (Intentional omission to give information) corresponds to BNS Section 235. Updated provisions.", "status": "mapped"},
    "203": {"bns": "236", "title": "Giving false information respecting an offence", "definition": "IPC Section 203 (Giving false information respecting an offence) corresponds to BNS Section 236. Updated provisions.", "status": "mapped"},
    "204": {"bns": "237", "title": "Destruction of document to prevent production", "definition": "IPC Section 204 (Destruction of document to prevent production) corresponds to BNS Section 237. Updated provisions.", "status": "mapped"},
    "205": {"bns": "238", "title": "False personation for purpose of act or proceeding", "definition": "IPC Section 205 (False personation for purpose of act or proceeding) corresponds to BNS Section 238. Updated provisions.", "status": "mapped"},
    "206": {"bns": "239", "title": "Fraudulent removal or concealment of property", "definition": "IPC Section 206 (Fraudulent removal or concealment of property) corresponds to BNS Section 239. Updated provisions.", "status": "mapped"},
    "207": {"bns": "240", "title": "Fraudulent claim to property", "definition": "IPC Section 207 (Fraudulent claim to property) corresponds to BNS Section 240. Updated provisions.", "status": "mapped"},
    "208": {"bns": "241", "title": "Fraudulently suffering decree for sum not due", "definition": "IPC Section 208 (Fraudulently suffering decree for sum not due) corresponds to BNS Section 241. Updated provisions.", "status": "mapped"},
    "209": {"bns": "242", "title": "Dishonestly making false claim in Court", "definition": "IPC Section 209 (Dishonestly making false claim in Court) corresponds to BNS Section 242. Updated provisions.", "status": "mapped"},
    "210": {"bns": "243", "title": "Fraudulently obtaining decree for sum not due", "definition": "IPC Section 210 (Fraudulently obtaining decree for sum not due) corresponds to BNS Section 243. Updated provisions.", "status": "mapped"},
    "211": {"bns": "244", "title": "False charge of offence with intent to injure", "definition": "IPC Section 211 (False charge of offence with intent to injure) corresponds to BNS Section 244. Enhanced punishment.", "status": "mapped"},
    "212": {"bns": "245", "title": "Harbouring offender", "definition": "IPC Section 212 (Harbouring offender) corresponds to BNS Section 245. Updated provisions.", "status": "mapped"},
    "213": {"bns": "246", "title": "Taking gift to screen offender from punishment", "definition": "IPC Section 213 (Taking gift to screen offender from punishment) corresponds to BNS Section 246. Updated provisions.", "status": "mapped"},
    "214": {"bns": "247", "title": "Offering gift or restoration of property", "definition": "IPC Section 214 (Offering gift or restoration of property) corresponds to BNS Section 247. Updated provisions.", "status": "mapped"},
    "215": {"bns": "248", "title": "Taking gift to help to recover stolen property", "definition": "IPC Section 215 (Taking gift to help to recover stolen property) corresponds to BNS Section 248. Updated provisions.", "status": "mapped"},
    "216": {"bns": "249", "title": "Harbouring offender who has escaped", "definition": "IPC Section 216 (Harbouring offender who has escaped) corresponds to BNS Section 249. Updated provisions.", "status": "mapped"},
    "216A": {"bns": "250", "title": "Penalty for harbouring robbers or dacoits", "definition": "IPC Section 216A (Penalty for harbouring robbers or dacoits) corresponds to BNS Section 250. Enhanced punishment.", "status": "mapped"},
    "216B": {"bns": "251", "title": "Definition of harbour in 212 and 216", "definition": "IPC Section 216B (Definition of harbour in 212 and 216) corresponds to BNS Section 251. Clarification provided.", "status": "mapped"},
    "217": {"bns": "252", "title": "Public servant disobeying direction of law", "definition": "IPC Section 217 (Public servant disobeying direction of law) corresponds to BNS Section 252. Updated provisions.", "status": "mapped"},
    "218": {"bns": "253", "title": "Public servant framing incorrect record", "definition": "IPC Section 218 (Public servant framing incorrect record) corresponds to BNS Section 253. Updated provisions.", "status": "mapped"},
    "219": {"bns": "254", "title": "Public servant in judicial proceeding corruptly making incorrect report", "definition": "IPC Section 219 (Public servant in judicial proceeding corruptly making incorrect report) corresponds to BNS Section 254. Enhanced punishment.", "status": "mapped"},
    "220": {"bns": "255", "title": "Commitment for trial or confinement by person having no authority", "definition": "IPC Section 220 (Commitment for trial or confinement by person having no authority) corresponds to BNS Section 255. Updated provisions.", "status": "mapped"},
    "221": {"bns": "256", "title": "Intentional omission to apprehend on part of public servant", "definition": "IPC Section 221 (Intentional omission to apprehend on part of public servant) corresponds to BNS Section 256. Updated provisions.", "status": "mapped"},
    "222": {"bns": "257", "title": "Intentional omission to apprehend escapee", "definition": "IPC Section 222 (Intentional omission to apprehend escapee) corresponds to BNS Section 257. Updated provisions.", "status": "mapped"},
    "223": {"bns": "258", "title": "Escape from confinement or custody", "definition": "IPC Section 223 (Escape from confinement or custody) corresponds to BNS Section 258. Updated provisions.", "status": "mapped"},
    "224": {"bns": "259", "title": "Resistance or obstruction by person to lawful apprehension", "definition": "IPC Section 224 (Resistance or obstruction by person to lawful apprehension) corresponds to BNS Section 259. Updated provisions.", "status": "mapped"},
    "225": {"bns": "260", "title": "Resistance or obstruction to lawful apprehension of another", "definition": "IPC Section 225 (Resistance or obstruction to lawful apprehension of another) corresponds to BNS Section 260. Updated provisions.", "status": "mapped"},
    "225A": {"bns": "261", "title": "Omission to apprehend or sufferance of escape on part of public servant", "definition": "IPC Section 225A (Omission to apprehend or sufferance of escape on part of public servant) corresponds to BNS Section 261. Updated provisions.", "status": "mapped"},
    "225B": {"bns": "262", "title": "Resistance or obstruction to lawful apprehension or escape", "definition": "IPC Section 225B (Resistance or obstruction to lawful apprehension or escape) corresponds to BNS Section 262. Updated provisions.", "status": "mapped"},
    "226": {"bns": "263", "title": "Unlawful return from transportation", "definition": "IPC Section 226 (Unlawful return from transportation) corresponds to BNS Section 263. Modernized for current context.", "status": "modified"},
    "227": {"bns": "264", "title": "Violation of condition of remission of punishment", "definition": "IPC Section 227 (Violation of condition of remission of punishment) corresponds to BNS Section 264. Updated provisions.", "status": "mapped"},
    "228": {"bns": "265", "title": "Intentional insult or interruption to public servant", "definition": "IPC Section 228 (Intentional insult or interruption to public servant) corresponds to BNS Section 265. Updated provisions.", "status": "mapped"},
    "228A": {"bns": "72", "title": "Disclosure of identity of victim of certain offences", "definition": "IPC Section 228A (Disclosure of identity of victim of certain offences) corresponds to BNS Section 72. Moved to offences against women section.", "status": "mapped"},
    "229": {"bns": "266", "title": "Personation of juror or assessor", "definition": "IPC Section 229 (Personation of juror or assessor) corresponds to BNS Section 266. Updated provisions.", "status": "mapped"},
    "229A": {"bns": "267", "title": "Failure by person released on bail or bond to appear", "definition": "IPC Section 229A (Failure by person released on bail or bond to appear) corresponds to BNS Section 267. New provision in IPC, retained in BNS.", "status": "modified"},
    "230": {"bns": "268", "title": "Coin defined", "definition": "IPC Section 230 (Coin defined) corresponds to BNS Section 268. Definition retained.", "status": "mapped"},
    "231": {"bns": "269", "title": "Counterfeiting coin", "definition": "IPC Section 231 (Counterfeiting coin) corresponds to BNS Section 269. Updated provisions.", "status": "mapped"},
    "232": {"bns": "270", "title": "Counterfeiting Indian coin", "definition": "IPC Section 232 (Counterfeiting Indian coin) corresponds to BNS Section 270. Enhanced punishment.", "status": "mapped"},
    "233": {"bns": "271", "title": "Making or selling instrument for counterfeiting coin", "definition": "IPC Section 233 (Making or selling instrument for counterfeiting coin) corresponds to BNS Section 271. Updated provisions.", "status": "mapped"},
    "234": {"bns": "272", "title": "Making or selling instrument for counterfeiting Indian coin", "definition": "IPC Section 234 (Making or selling instrument for counterfeiting Indian coin) corresponds to BNS Section 272. Enhanced punishment.", "status": "mapped"},
    "235": {"bns": "273", "title": "Possession of instrument for counterfeiting coin", "definition": "IPC Section 235 (Possession of instrument for counterfeiting coin) corresponds to BNS Section 273. Updated provisions.", "status": "mapped"},
    "236": {"bns": "274", "title": "Abetting in India counterfeiting out of India", "definition": "IPC Section 236 (Abetting in India counterfeiting out of India) corresponds to BNS Section 274. Updated provisions.", "status": "mapped"},
    "237": {"bns": "275", "title": "Import or export of counterfeit coin", "definition": "IPC Section 237 (Import or export of counterfeit coin) corresponds to BNS Section 275. Updated provisions.", "status": "mapped"},
    "238": {"bns": "276", "title": "Import or export of counterfeits of Indian coin", "definition": "IPC Section 238 (Import or export of counterfeits of Indian coin) corresponds to BNS Section 276. Enhanced punishment.", "status": "mapped"},
    "239": {"bns": "277", "title": "Delivery of coin possessed with knowledge genuine", "definition": "IPC Section 239 (Delivery of coin possessed with knowledge genuine) corresponds to BNS Section 277. Updated provisions.", "status": "mapped"},
    "240": {"bns": "278", "title": "Delivery of Indian coin possessed with knowledge counterfeit", "definition": "IPC Section 240 (Delivery of Indian coin possessed with knowledge counterfeit) corresponds to BNS Section 278. Enhanced punishment.", "status": "mapped"},
    "241": {"bns": "279", "title": "Delivery of coin as genuine which possessor knows counterfeit", "definition": "IPC Section 241 (Delivery of coin as genuine which possessor knows counterfeit) corresponds to BNS Section 279. Updated provisions.", "status": "mapped"},
    "242": {"bns": "280", "title": "Possession of counterfeit coin by person who knew it counterfeit", "definition": "IPC Section 242 (Possession of counterfeit coin by person who knew it counterfeit) corresponds to BNS Section 280. Updated provisions.", "status": "mapped"},
    "243": {"bns": "281", "title": "Possession of Indian coin by person who knew it counterfeit", "definition": "IPC Section 243 (Possession of Indian coin by person who knew it counterfeit) corresponds to BNS Section 281. Enhanced punishment.", "status": "mapped"},
    "244": {"bns": "282", "title": "Person employed in mint causing coin to be of different weight", "definition": "IPC Section 244 (Person employed in mint causing coin to be of different weight) corresponds to BNS Section 282. Updated provisions.", "status": "mapped"},
    "245": {"bns": "283", "title": "Unlawfully taking coining instrument from mint", "definition": "IPC Section 245 (Unlawfully taking coining instrument from mint) corresponds to BNS Section 283. Updated provisions.", "status": "mapped"},
    "246": {"bns": "284", "title": "Fraudulently or dishonestly diminishing weight of coin", "definition": "IPC Section 246 (Fraudulently or dishonestly diminishing weight of coin) corresponds to BNS Section 284. Updated provisions.", "status": "mapped"},
    "247": {"bns": "285", "title": "Fraudulently or dishonestly diminishing weight of Indian coin", "definition": "IPC Section 247 (Fraudulently or dishonestly diminishing weight of Indian coin) corresponds to BNS Section 285. Enhanced punishment.", "status": "mapped"},
    "248": {"bns": "286", "title": "Altering appearance of coin with intent", "definition": "IPC Section 248 (Altering appearance of coin with intent) corresponds to BNS Section 286. Updated provisions.", "status": "mapped"},
    "249": {"bns": "287", "title": "Altering appearance of Indian coin with intent", "definition": "IPC Section 249 (Altering appearance of Indian coin with intent) corresponds to BNS Section 287. Enhanced punishment.", "status": "mapped"},
    "250": {"bns": "288", "title": "Delivery of coin possessed with knowledge altered", "definition": "IPC Section 250 (Delivery of coin possessed with knowledge altered) corresponds to BNS Section 288. Updated provisions.", "status": "mapped"},
    "251": {"bns": "289", "title": "Delivery of Indian coin possessed with knowledge altered", "definition": "IPC Section 251 (Delivery of Indian coin possessed with knowledge altered) corresponds to BNS Section 289. Enhanced punishment.", "status": "mapped"},
    "252": {"bns": "290", "title": "Possession of altered coin", "definition": "IPC Section 252 (Possession of altered coin) corresponds to BNS Section 290. Updated provisions.", "status": "mapped"},
    "253": {"bns": "291", "title": "Possession of altered Indian coin", "definition": "IPC Section 253 (Possession of altered Indian coin) corresponds to BNS Section 291. Enhanced punishment.", "status": "mapped"},
    "254": {"bns": "292", "title": "Delivery of coin as genuine which possessor knows altered", "definition": "IPC Section 254 (Delivery of coin as genuine which possessor knows altered) corresponds to BNS Section 292. Updated provisions.", "status": "mapped"},
    "255": {"bns": "293", "title": "Counterfeiting Government stamp", "definition": "IPC Section 255 (Counterfeiting Government stamp) corresponds to BNS Section 293. Updated provisions.", "status": "mapped"},
    "256": {"bns": "294", "title": "Having possession of instrument for counterfeiting stamp", "definition": "IPC Section 256 (Having possession of instrument for counterfeiting stamp) corresponds to BNS Section 294. Updated provisions.", "status": "mapped"},
    "257": {"bns": "295", "title": "Making or selling instrument for counterfeiting stamp", "definition": "IPC Section 257 (Making or selling instrument for counterfeiting stamp) corresponds to BNS Section 295. Updated provisions.", "status": "mapped"},
    "258": {"bns": "296", "title": "Sale of counterfeit Government stamp", "definition": "IPC Section 258 (Sale of counterfeit Government stamp) corresponds to BNS Section 296. Updated provisions.", "status": "mapped"},
    "259": {"bns": "297", "title": "Having possession of counterfeit Government stamp", "definition": "IPC Section 259 (Having possession of counterfeit Government stamp) corresponds to BNS Section 297. Updated provisions.", "status": "mapped"},
    "260": {"bns": "298", "title": "Using as genuine a Government stamp known to be counterfeit", "definition": "IPC Section 260 (Using as genuine a Government stamp known to be counterfeit) corresponds to BNS Section 298. Updated provisions.", "status": "mapped"},
    "261": {"bns": "299", "title": "Effacing writing from substance bearing Government stamp", "definition": "IPC Section 261 (Effacing writing from substance bearing Government stamp) corresponds to BNS Section 299. Updated provisions.", "status": "mapped"},
    "262": {"bns": "300", "title": "Using Government stamp known to have been before used", "definition": "IPC Section 262 (Using Government stamp known to have been before used) corresponds to BNS Section 300. Updated provisions.", "status": "mapped"},
    "263": {"bns": "301", "title": "Erasure of mark denoting that stamp has been used", "definition": "IPC Section 263 (Erasure of mark denoting that stamp has been used) corresponds to BNS Section 301. Updated provisions.", "status": "mapped"},
    "263A": {"bns": "302", "title": "Prohibition of fictitious stamps", "definition": "IPC Section 263A (Prohibition of fictitious stamps) corresponds to BNS Section 302. Updated provisions.", "status": "mapped"},
    "264": {"bns": "336", "title": "Fraudulent use of false instrument for weighing", "definition": "IPC Section 264 (Fraudulent use of false instrument for weighing) corresponds to BNS Section 336. Repositioned in BNS under forgery chapter.", "status": "mapped"},
    "265": {"bns": "336", "title": "Fraudulent use of false weight or measure", "definition": "IPC Section 265 (Fraudulent use of false weight or measure) corresponds to BNS Section 336. Consolidated with 264.", "status": "mapped"},
    "266": {"bns": "336", "title": "Being in possession of false weight or measure", "definition": "IPC Section 266 (Being in possession of false weight or measure) corresponds to BNS Section 336. Consolidated with 264.", "status": "mapped"},
    "267": {"bns": "336", "title": "Making or selling false weight or measure", "definition": "IPC Section 267 (Making or selling false weight or measure) corresponds to BNS Section 336. Consolidated with 264.", "status": "mapped"},
    "268": {"bns": "270", "title": "Public nuisance", "definition": "IPC Section 268 (Public nuisance) corresponds to BNS Section 270. Definition retained.", "status": "mapped"},
    "269": {"bns": "271", "title": "Negligent act likely to spread infection", "definition": "IPC Section 269 (Negligent act likely to spread infection) corresponds to BNS Section 271. Updated with modern context.", "status": "mapped"},
    "270": {"bns": "272", "title": "Malignant act likely to spread infection", "definition": "IPC Section 270 (Malignant act likely to spread infection) corresponds to BNS Section 272. Enhanced punishment post-pandemic.", "status": "mapped"},
    "271": {"bns": "273", "title": "Disobedience to quarantine rule", "definition": "IPC Section 271 (Disobedience to quarantine rule) corresponds to BNS Section 273. Updated provisions.", "status": "mapped"},
    "272": {"bns": "274", "title": "Adulteration of food or drink for sale", "definition": "IPC Section 272 (Adulteration of food or drink for sale) corresponds to BNS Section 274. Enhanced punishment.", "status": "mapped"},
    "273": {"bns": "275", "title": "Sale of noxious food or drink", "definition": "IPC Section 273 (Sale of noxious food or drink) corresponds to BNS Section 275. Updated provisions.", "status": "mapped"},
    "274": {"bns": "276", "title": "Adulteration of drugs", "definition": "IPC Section 274 (Adulteration of drugs) corresponds to BNS Section 276. Enhanced punishment.", "status": "mapped"},
    "275": {"bns": "277", "title": "Sale of adulterated drugs", "definition": "IPC Section 275 (Sale of adulterated drugs) corresponds to BNS Section 277. Updated provisions.", "status": "mapped"},
    "276": {"bns": "278", "title": "Sale of drug as different drug or preparation", "definition": "IPC Section 276 (Sale of drug as different drug or preparation) corresponds to BNS Section 278. Updated provisions.", "status": "mapped"},
    "277": {"bns": "279", "title": "Fouling water of public spring or reservoir", "definition": "IPC Section 277 (Fouling water of public spring or reservoir) corresponds to BNS Section 279. Updated provisions.", "status": "mapped"},
    "278": {"bns": "280", "title": "Making atmosphere noxious to health", "definition": "IPC Section 278 (Making atmosphere noxious to health) corresponds to BNS Section 280. Updated provisions.", "status": "mapped"},
    "279": {"bns": "281", "title": "Rash driving or riding on public way", "definition": "IPC Section 279 (Rash driving or riding on public way) corresponds to BNS Section 281. Modernized for vehicles, enhanced punishment.", "status": "modified"},
    "280": {"bns": "282", "title": "Rash navigation of vessel", "definition": "IPC Section 280 (Rash navigation of vessel) corresponds to BNS Section 282. Updated provisions.", "status": "mapped"},
    "281": {"bns": "283", "title": "Exhibition of false light, mark or buoy", "definition": "IPC Section 281 (Exhibition of false light, mark or buoy) corresponds to BNS Section 283. Updated provisions.", "status": "mapped"},
    "282": {"bns": "284", "title": "Conveying person by water for hire in unsafe vessel", "definition": "IPC Section 282 (Conveying person by water for hire in unsafe vessel) corresponds to BNS Section 284. Updated provisions.", "status": "mapped"},
    "283": {"bns": "285", "title": "Danger or obstruction in public way", "definition": "IPC Section 283 (Danger or obstruction in public way) corresponds to BNS Section 285. Updated provisions.", "status": "mapped"},
    "284": {"bns": "286", "title": "Negligent conduct with respect to poisonous substance", "definition": "IPC Section 284 (Negligent conduct with respect to poisonous substance) corresponds to BNS Section 286. Updated provisions.", "status": "mapped"},
    "285": {"bns": "287", "title": "Negligent conduct with respect to fire", "definition": "IPC Section 285 (Negligent conduct with respect to fire) corresponds to BNS Section 287. Updated provisions.", "status": "mapped"},
    "286": {"bns": "288", "title": "Negligent conduct with respect to explosive substance", "definition": "IPC Section 286 (Negligent conduct with respect to explosive substance) corresponds to BNS Section 288. Enhanced punishment.", "status": "mapped"},
    "287": {"bns": "289", "title": "Negligent conduct with respect to machinery", "definition": "IPC Section 287 (Negligent conduct with respect to machinery) corresponds to BNS Section 289. Updated provisions.", "status": "mapped"},
    "288": {"bns": "290", "title": "Negligent conduct with respect to pulling down buildings", "definition": "IPC Section 288 (Negligent conduct with respect to pulling down buildings) corresponds to BNS Section 290. Updated provisions.", "status": "mapped"},
    "289": {"bns": "291", "title": "Negligent conduct with respect to animal", "definition": "IPC Section 289 (Negligent conduct with respect to animal) corresponds to BNS Section 291. Updated provisions.", "status": "mapped"},
    "290": {"bns": "292", "title": "Punishment for public nuisance", "definition": "IPC Section 290 (Punishment for public nuisance) corresponds to BNS Section 292. Updated provisions.", "status": "mapped"},
    "291": {"bns": "293", "title": "Continuance of nuisance after injunction", "definition": "IPC Section 291 (Continuance of nuisance after injunction) corresponds to BNS Section 293. Updated provisions.", "status": "mapped"},
    "292": {"bns": "294", "title": "Sale of obscene books", "definition": "IPC Section 292 (Sale of obscene books) corresponds to BNS Section 294. Modernized for digital content.", "status": "modified"},
    "293": {"bns": "295", "title": "Sale of obscene objects to young person", "definition": "IPC Section 293 (Sale of obscene objects to young person) corresponds to BNS Section 295. Enhanced protection for minors.", "status": "mapped"},
    "294": {"bns": "296", "title": "Obscene acts and songs", "definition": "IPC Section 294 (Obscene acts and songs) corresponds to BNS Section 296. Updated provisions.", "status": "mapped"},
    "294A": {"bns": "297", "title": "Keeping lottery office", "definition": "IPC Section 294A (Keeping lottery office) corresponds to BNS Section 297. Updated provisions.", "status": "mapped"},
    "295": {"bns": "298", "title": "Injuring or defiling place of worship", "definition": "IPC Section 295 (Injuring or defiling place of worship) corresponds to BNS Section 298. Updated provisions.", "status": "mapped"},
    "295A": {"bns": "299", "title": "Malicious acts to outrage religious feelings", "definition": "IPC Section 295A (Malicious acts to outrage religious feelings) corresponds to BNS Section 299. Updated provisions.", "status": "mapped"},
    "296": {"bns": "300", "title": "Disturbing religious assembly", "definition": "IPC Section 296 (Disturbing religious assembly) corresponds to BNS Section 300. Updated provisions.", "status": "mapped"},
    "297": {"bns": "301", "title": "Trespassing on burial places", "definition": "IPC Section 297 (Trespassing on burial places) corresponds to BNS Section 301. Updated provisions.", "status": "mapped"},
    "298": {"bns": "302", "title": "Uttering words to wound religious feelings", "definition": "IPC Section 298 (Uttering words to wound religious feelings) corresponds to BNS Section 302. Updated provisions.", "status": "mapped"},
    "299": {"bns": "100", "title": "Culpable homicide", "definition": "IPC Section 299 (Culpable homicide) corresponds to BNS Section 100. Definition remains similar.", "status": "mapped"},
    "300": {"bns": "101", "title": "Murder", "definition": "IPC Section 300 (Murder) corresponds to BNS Section 101. Definition largely unchanged.", "status": "mapped"},
    "301": {"bns": "102", "title": "Culpable homicide by causing death of person other than intended", "definition": "IPC Section 301 (Culpable homicide by causing death of person other than intended) corresponds to BNS Section 102. Updated provisions.", "status": "mapped"},
    "302": {"bns": "103", "title": "Punishment for murder", "definition": "IPC Section 302 (Punishment for murder) corresponds to BNS Section 103. Enhanced punishment provisions.", "status": "mapped"},
    "303": {"bns": "104", "title": "Punishment for murder by life convict", "definition": "IPC Section 303 (Punishment for murder by life convict) corresponds to BNS Section 104. Retained with modifications.", "status": "mapped"},
    "304": {"bns": "105", "title": "Punishment for culpable homicide not amounting to murder", "definition": "IPC Section 304 (Punishment for culpable homicide not amounting to murder) corresponds to BNS Section 105. Updated sentencing.", "status": "mapped"},
    "304A": {"bns": "106", "title": "Causing death by negligence", "definition": "IPC Section 304A (Causing death by negligence) corresponds to BNS Section 106. New provisions for medical practitioners.", "status": "modified"},
    "304B": {"bns": "80", "title": "Dowry death", "definition": "IPC Section 304B (Dowry death) corresponds to BNS Section 80. Moved to offences against women.", "status": "mapped"},
    "305": {"bns": "107", "title": "Abetment of suicide of child or insane person", "definition": "IPC Section 305 (Abetment of suicide of child or insane person) corresponds to BNS Section 107. Enhanced punishment.", "status": "mapped"},
    "306": {"bns": "108", "title": "Abetment of suicide", "definition": "IPC Section 306 (Abetment of suicide) corresponds to BNS Section 108. Updated provisions.", "status": "mapped"},
    "307": {"bns": "109", "title": "Attempt to murder", "definition": "IPC Section 307 (Attempt to murder) corresponds to BNS Section 109. Enhanced punishment.", "status": "mapped"},
    "308": {"bns": "110", "title": "Attempt to commit culpable homicide", "definition": "IPC Section 308 (Attempt to commit culpable homicide) corresponds to BNS Section 110. Updated provisions.", "status": "mapped"},
    "309": {"bns": "Repealed", "title": "Attempt to commit suicide", "definition": "This IPC section has been repealed or struck down. Decriminalized - provision repealed.", "status": "repealed"},
    "310": {"bns": "111", "title": "Thug", "definition": "IPC Section 310 (Thug) corresponds to BNS Section 111. Definition retained.", "status": "mapped"},
    "311": {"bns": "111", "title": "Punishment for thuggee", "definition": "IPC Section 311 (Punishment for thuggee) corresponds to BNS Section 111. Consolidated with 310.", "status": "mapped"},
    "312": {"bns": "88", "title": "Causing miscarriage", "definition": "IPC Section 312 (Causing miscarriage) corresponds to BNS Section 88. Moved to offences against women.", "status": "mapped"},
    "313": {"bns": "89", "title": "Causing miscarriage without woman's consent", "definition": "IPC Section 313 (Causing miscarriage without woman's consent) corresponds to BNS Section 89. Moved to offences against women.", "status": "mapped"},
    "314": {"bns": "90", "title": "Death caused by act done with intent to cause miscarriage", "definition": "IPC Section 314 (Death caused by act done with intent to cause miscarriage) corresponds to BNS Section 90. Moved to offences against women.", "status": "mapped"},
    "315": {"bns": "91", "title": "Act done with intent to prevent child being born alive", "definition": "IPC Section 315 (Act done with intent to prevent child being born alive) corresponds to BNS Section 91. Moved to offences against women.", "status": "mapped"},
    "316": {"bns": "92", "title": "Causing death of quick unborn child", "definition": "IPC Section 316 (Causing death of quick unborn child) corresponds to BNS Section 92. Moved to offences against women.", "status": "mapped"},
    "317": {"bns": "93", "title": "Exposure and abandonment of child", "definition": "IPC Section 317 (Exposure and abandonment of child) corresponds to BNS Section 93. Moved to offences against children.", "status": "mapped"},
    "318": {"bns": "94", "title": "Concealment of birth by secret disposal of dead body", "definition": "IPC Section 318 (Concealment of birth by secret disposal of dead body) corresponds to BNS Section 94. Updated provisions.", "status": "mapped"},
    "319": {"bns": "114", "title": "Hurt", "definition": "IPC Section 319 (Hurt) corresponds to BNS Section 114. Definition unchanged.", "status": "mapped"},
    "320": {"bns": "116", "title": "Grievous hurt", "definition": "IPC Section 320 (Grievous hurt) corresponds to BNS Section 116. Same categories maintained.", "status": "mapped"},
    "321": {"bns": "115", "title": "Voluntarily causing hurt", "definition": "IPC Section 321 (Voluntarily causing hurt) corresponds to BNS Section 115. Minor changes in punishment.", "status": "mapped"},
    "322": {"bns": "117", "title": "Voluntarily causing grievous hurt", "definition": "IPC Section 322 (Voluntarily causing grievous hurt) corresponds to BNS Section 117. Updated provisions.", "status": "mapped"},
    "323": {"bns": "115(2)", "title": "Punishment for voluntarily causing hurt", "definition": "IPC Section 323 (Punishment for voluntarily causing hurt) corresponds to BNS Section 115(2). Now under section 115.", "status": "mapped"},
    "324": {"bns": "117(2)", "title": "Voluntarily causing hurt by dangerous weapons", "definition": "IPC Section 324 (Voluntarily causing hurt by dangerous weapons) corresponds to BNS Section 117(2). Consolidated.", "status": "mapped"},
    "325": {"bns": "117(2)", "title": "Punishment for voluntarily causing grievous hurt", "definition": "IPC Section 325 (Punishment for voluntarily causing grievous hurt) corresponds to BNS Section 117(2). Updated.", "status": "mapped"},
    "326": {"bns": "118", "title": "Voluntarily causing grievous hurt by dangerous weapons", "definition": "IPC Section 326 (Voluntarily causing grievous hurt by dangerous weapons) corresponds to BNS Section 118. Enhanced punishments.", "status": "mapped"},
    "326A": {"bns": "124", "title": "Voluntarily causing grievous hurt by use of acid", "definition": "IPC Section 326A (Voluntarily causing grievous hurt by use of acid) corresponds to BNS Section 124. Retained with modifications.", "status": "mapped"},
    "326B": {"bns": "124(2)", "title": "Voluntarily throwing acid", "definition": "IPC Section 326B (Voluntarily throwing acid) corresponds to BNS Section 124(2). Now under section 124.", "status": "mapped"},
    "327": {"bns": "119", "title": "Voluntarily causing hurt to extort property", "definition": "IPC Section 327 (Voluntarily causing hurt to extort property) corresponds to BNS Section 119. Updated provisions.", "status": "mapped"},
    "328": {"bns": "120", "title": "Causing hurt by means of poison with intent to commit offence", "definition": "IPC Section 328 (Causing hurt by means of poison with intent to commit offence) corresponds to BNS Section 120. Updated provisions.", "status": "mapped"},
    "329": {"bns": "121", "title": "Voluntarily causing grievous hurt to extort property", "definition": "IPC Section 329 (Voluntarily causing grievous hurt to extort property) corresponds to BNS Section 121. Enhanced punishment.", "status": "mapped"},
    "330": {"bns": "122", "title": "Voluntarily causing hurt to extort confession", "definition": "IPC Section 330 (Voluntarily causing hurt to extort confession) corresponds to BNS Section 122. Updated provisions.", "status": "mapped"},
    "331": {"bns": "123", "title": "Voluntarily causing grievous hurt to extort confession", "definition": "IPC Section 331 (Voluntarily causing grievous hurt to extort confession) corresponds to BNS Section 123. Enhanced punishment.", "status": "mapped"},
    "332": {"bns": "132", "title": "Voluntarily causing hurt to deter public servant", "definition": "IPC Section 332 (Voluntarily causing hurt to deter public servant) corresponds to BNS Section 132. Updated provisions.", "status": "mapped"},
    "333": {"bns": "133", "title": "Voluntarily causing grievous hurt to deter public servant", "definition": "IPC Section 333 (Voluntarily causing grievous hurt to deter public servant) corresponds to BNS Section 133. Enhanced punishment.", "status": "mapped"},
    "334": {"bns": "125", "title": "Voluntarily causing hurt on provocation", "definition": "IPC Section 334 (Voluntarily causing hurt on provocation) corresponds to BNS Section 125. Updated provisions.", "status": "mapped"},
    "335": {"bns": "126", "title": "Voluntarily causing grievous hurt on provocation", "definition": "IPC Section 335 (Voluntarily causing grievous hurt on provocation) corresponds to BNS Section 126. Updated provisions.", "status": "mapped"},
    "336": {"bns": "134", "title": "Act endangering life or personal safety of others", "definition": "IPC Section 336 (Act endangering life or personal safety of others) corresponds to BNS Section 134. Updated provisions.", "status": "mapped"},
    "337": {"bns": "135", "title": "Causing hurt by act endangering life", "definition": "IPC Section 337 (Causing hurt by act endangering life) corresponds to BNS Section 135. Updated provisions.", "status": "mapped"},
    "338": {"bns": "136", "title": "Causing grievous hurt by act endangering life", "definition": "IPC Section 338 (Causing grievous hurt by act endangering life) corresponds to BNS Section 136. Enhanced punishment.", "status": "mapped"},
    "339": {"bns": "126", "title": "Wrongful restraint", "definition": "IPC Section 339 (Wrongful restraint) corresponds to BNS Section 126. Definition similar.", "status": "mapped"},
    "340": {"bns": "126(2)", "title": "Wrongful confinement", "definition": "IPC Section 340 (Wrongful confinement) corresponds to BNS Section 126(2). Definition retained.", "status": "mapped"},
    "341": {"bns": "126(2)", "title": "Punishment for wrongful restraint", "definition": "IPC Section 341 (Punishment for wrongful restraint) corresponds to BNS Section 126(2). Consolidated.", "status": "mapped"},
    "342": {"bns": "127", "title": "Punishment for wrongful confinement", "definition": "IPC Section 342 (Punishment for wrongful confinement) corresponds to BNS Section 127. Updated provisions.", "status": "mapped"},
    "343": {"bns": "127(2)", "title": "Wrongful confinement for three or more days", "definition": "IPC Section 343 (Wrongful confinement for three or more days) corresponds to BNS Section 127(2). Enhanced punishment.", "status": "mapped"},
    "344": {"bns": "127(3)", "title": "Wrongful confinement for ten or more days", "definition": "IPC Section 344 (Wrongful confinement for ten or more days) corresponds to BNS Section 127(3). Enhanced punishment.", "status": "mapped"},
    "345": {"bns": "127(4)", "title": "Wrongful confinement of person for whose liberation writ issued", "definition": "IPC Section 345 (Wrongful confinement of person for whose liberation writ issued) corresponds to BNS Section 127(4). Updated provisions.", "status": "mapped"},
    "346": {"bns": "128", "title": "Wrongful confinement in secret", "definition": "IPC Section 346 (Wrongful confinement in secret) corresponds to BNS Section 128. Enhanced punishment.", "status": "mapped"},
    "347": {"bns": "129", "title": "Wrongful confinement to extort property", "definition": "IPC Section 347 (Wrongful confinement to extort property) corresponds to BNS Section 129. Updated provisions.", "status": "mapped"},
    "348": {"bns": "130", "title": "Wrongful confinement to extort confession", "definition": "IPC Section 348 (Wrongful confinement to extort confession) corresponds to BNS Section 130. Updated provisions.", "status": "mapped"},
    "349": {"bns": "128", "title": "Force", "definition": "IPC Section 349 (Force) corresponds to BNS Section 128. Definition retained.", "status": "mapped"},
    "350": {"bns": "128", "title": "Criminal force", "definition": "IPC Section 350 (Criminal force) corresponds to BNS Section 128. Definition unchanged.", "status": "mapped"},
    "351": {"bns": "129", "title": "Assault", "definition": "IPC Section 351 (Assault) corresponds to BNS Section 129. Definition similar.", "status": "mapped"},
    "352": {"bns": "131", "title": "Punishment for assault or criminal force", "definition": "IPC Section 352 (Punishment for assault or criminal force) corresponds to BNS Section 131. Updated provisions.", "status": "mapped"},
    "353": {"bns": "132", "title": "Assault to deter public servant from duty", "definition": "IPC Section 353 (Assault to deter public servant from duty) corresponds to BNS Section 132. Enhanced punishment.", "status": "mapped"},
    "354": {"bns": "74", "title": "Assault or criminal force to woman with intent to outrage modesty", "definition": "IPC Section 354 (Assault or criminal force to woman with intent to outrage modesty) corresponds to BNS Section 74. Moved to offences against women.", "status": "mapped"},
    "354A": {"bns": "75", "title": "Sexual harassment", "definition": "IPC Section 354A (Sexual harassment) corresponds to BNS Section 75. Retained under women offences.", "status": "mapped"},
    "354B": {"bns": "76", "title": "Assault with intent to disrobe", "definition": "IPC Section 354B (Assault with intent to disrobe) corresponds to BNS Section 76. Retained under women offences.", "status": "mapped"},
    "354C": {"bns": "77", "title": "Voyeurism", "definition": "IPC Section 354C (Voyeurism) corresponds to BNS Section 77. Retained with modifications.", "status": "mapped"},
    "354D": {"bns": "78", "title": "Stalking", "definition": "IPC Section 354D (Stalking) corresponds to BNS Section 78. Retained under women offences.", "status": "mapped"},
    "355": {"bns": "131(2)", "title": "Assault or criminal force with intent to dishonor", "definition": "IPC Section 355 (Assault or criminal force with intent to dishonor) corresponds to BNS Section 131(2). Updated provisions.", "status": "mapped"},
    "356": {"bns": "131(3)", "title": "Assault or criminal force in attempt to commit theft", "definition": "IPC Section 356 (Assault or criminal force in attempt to commit theft) corresponds to BNS Section 131(3). Updated provisions.", "status": "mapped"},
    "357": {"bns": "131(4)", "title": "Assault or criminal force in attempting wrongful confinement", "definition": "IPC Section 357 (Assault or criminal force in attempting wrongful confinement) corresponds to BNS Section 131(4). Updated provisions.", "status": "mapped"},
    "358": {"bns": "131(5)", "title": "Assault or criminal force on grave provocation", "definition": "IPC Section 358 (Assault or criminal force on grave provocation) corresponds to BNS Section 131(5). Updated provisions.", "status": "mapped"},
    "359": {"bns": "137", "title": "Kidnapping", "definition": "IPC Section 359 (Kidnapping) corresponds to BNS Section 137. Definition largely same.", "status": "mapped"},
    "360": {"bns": "137(1)(a)", "title": "Kidnapping from India", "definition": "IPC Section 360 (Kidnapping from India) corresponds to BNS Section 137(1)(a). Consolidated.", "status": "mapped"},
    "361": {"bns": "137(1)(b)", "title": "Kidnapping from lawful guardianship", "definition": "IPC Section 361 (Kidnapping from lawful guardianship) corresponds to BNS Section 137(1)(b). Consolidated.", "status": "mapped"},
    "362": {"bns": "138", "title": "Abduction", "definition": "IPC Section 362 (Abduction) corresponds to BNS Section 138. Definition unchanged.", "status": "mapped"},
    "363": {"bns": "137(2)", "title": "Punishment for kidnapping", "definition": "IPC Section 363 (Punishment for kidnapping) corresponds to BNS Section 137(2). Updated punishment.", "status": "mapped"},
    "363A": {"bns": "139", "title": "Kidnapping or maiming minor for begging", "definition": "IPC Section 363A (Kidnapping or maiming minor for begging) corresponds to BNS Section 139. Enhanced punishment.", "status": "mapped"},
    "363B": {"bns": "95", "title": "Importation of girl from foreign country", "definition": "IPC Section 363B (Importation of girl from foreign country) corresponds to BNS Section 95. Gender neutral, moved to trafficking.", "status": "mapped"},
    "364": {"bns": "140", "title": "Kidnapping for murder", "definition": "IPC Section 364 (Kidnapping for murder) corresponds to BNS Section 140. Updated provisions.", "status": "mapped"},
    "364A": {"bns": "140(2)", "title": "Kidnapping for ransom", "definition": "IPC Section 364A (Kidnapping for ransom) corresponds to BNS Section 140(2). Enhanced punishment - death penalty possible.", "status": "mapped"},
    "365": {"bns": "140(3)", "title": "Kidnapping with intent to secretly confine", "definition": "IPC Section 365 (Kidnapping with intent to secretly confine) corresponds to BNS Section 140(3). Updated provisions.", "status": "mapped"},
    "366": {"bns": "87", "title": "Kidnapping woman to compel marriage", "definition": "IPC Section 366 (Kidnapping woman to compel marriage) corresponds to BNS Section 87. Moved to marriage offences.", "status": "mapped"},
    "366A": {"bns": "96", "title": "Procuration of minor girl", "definition": "IPC Section 366A (Procuration of minor girl) corresponds to BNS Section 96. Updated provisions.", "status": "mapped"},
    "366B": {"bns": "141", "title": "Importation of girl from foreign country", "definition": "IPC Section 366B (Importation of girl from foreign country) corresponds to BNS Section 141. Gender neutral provisions.", "status": "mapped"},
    "367": {"bns": "142", "title": "Kidnapping to subject to grievous hurt", "definition": "IPC Section 367 (Kidnapping to subject to grievous hurt) corresponds to BNS Section 142. Consolidated.", "status": "mapped"},
    "368": {"bns": "143", "title": "Wrongfully concealing kidnapped person", "definition": "IPC Section 368 (Wrongfully concealing kidnapped person) corresponds to BNS Section 143. Now trafficking provisions.", "status": "mapped"},
    "369": {"bns": "143", "title": "Kidnapping to subject to slavery", "definition": "IPC Section 369 (Kidnapping to subject to slavery) corresponds to BNS Section 143. Consolidated with trafficking.", "status": "mapped"},
    "370": {"bns": "143", "title": "Trafficking of person", "definition": "IPC Section 370 (Trafficking of person) corresponds to BNS Section 143. Comprehensive trafficking law.", "status": "mapped"},
    "370A": {"bns": "144", "title": "Exploitation of trafficked person", "definition": "IPC Section 370A (Exploitation of trafficked person) corresponds to BNS Section 144. New provisions.", "status": "modified"},
    "371": {"bns": "145", "title": "Habitual dealing in slaves", "definition": "IPC Section 371 (Habitual dealing in slaves) corresponds to BNS Section 145. Updated provisions.", "status": "mapped"},
    "372": {"bns": "96", "title": "Selling minor for purposes of prostitution", "definition": "IPC Section 372 (Selling minor for purposes of prostitution) corresponds to BNS Section 96. Consolidated with procuration.", "status": "mapped"},
    "373": {"bns": "96", "title": "Buying minor for purposes of prostitution", "definition": "IPC Section 373 (Buying minor for purposes of prostitution) corresponds to BNS Section 96. Consolidated with procuration.", "status": "mapped"},
    "374": {"bns": "146", "title": "Unlawful compulsory labour", "definition": "IPC Section 374 (Unlawful compulsory labour) corresponds to BNS Section 146. Updated provisions.", "status": "mapped"},
    "375": {"bns": "63", "title": "Rape", "definition": "IPC Section 375 (Rape) corresponds to BNS Section 63. Expanded definition.", "status": "modified"},
    "376": {"bns": "64", "title": "Punishment for rape", "definition": "IPC Section 376 (Punishment for rape) corresponds to BNS Section 64. Enhanced punishments - minimum 10 years.", "status": "mapped"},
    "376A": {"bns": "66", "title": "Punishment causing death or vegetative state", "definition": "IPC Section 376A (Punishment causing death or vegetative state) corresponds to BNS Section 66. Specific provision - life/death penalty.", "status": "mapped"},
    "376AB": {"bns": "65", "title": "Punishment for rape of woman under 16", "definition": "IPC Section 376AB (Punishment for rape of woman under 16) corresponds to BNS Section 65. Age-specific provisions - minimum 20 years.", "status": "mapped"},
    "376B": {"bns": "67", "title": "Sexual intercourse by husband during separation", "definition": "IPC Section 376B (Sexual intercourse by husband during separation) corresponds to BNS Section 67. Retained.", "status": "mapped"},
    "376C": {"bns": "68", "title": "Sexual intercourse by person in authority", "definition": "IPC Section 376C (Sexual intercourse by person in authority) corresponds to BNS Section 68. Expanded scope.", "status": "modified"},
    "376D": {"bns": "70", "title": "Gang rape", "definition": "IPC Section 376D (Gang rape) corresponds to BNS Section 70. Enhanced punishment - minimum 20 years.", "status": "mapped"},
    "376E": {"bns": "71", "title": "Repeat offenders", "definition": "IPC Section 376E (Repeat offenders) corresponds to BNS Section 71. Life imprisonment or death penalty.", "status": "mapped"},
    "377": {"bns": "69", "title": "Unnatural offences", "definition": "IPC Section 377 (Unnatural offences) corresponds to BNS Section 69. Partially read down by Supreme Court, retained for non-consensual acts.", "status": "mapped"},
    "378": {"bns": "303", "title": "Theft", "definition": "IPC Section 378 (Theft) corresponds to BNS Section 303. Definition unchanged.", "status": "mapped"},
    "379": {"bns": "303(2)", "title": "Punishment for theft", "definition": "IPC Section 379 (Punishment for theft) corresponds to BNS Section 303(2). Updated punishment, community service option.", "status": "mapped"},
    "380": {"bns": "305", "title": "Theft in dwelling house", "definition": "IPC Section 380 (Theft in dwelling house) corresponds to BNS Section 305. Enhanced punishment.", "status": "mapped"},
    "381": {"bns": "306", "title": "Theft by clerk or servant", "definition": "IPC Section 381 (Theft by clerk or servant) corresponds to BNS Section 306. Updated provisions.", "status": "mapped"},
    "382": {"bns": "307", "title": "Theft after preparation for causing harm", "definition": "IPC Section 382 (Theft after preparation for causing harm) corresponds to BNS Section 307. Enhanced punishment.", "status": "mapped"},
    "383": {"bns": "308", "title": "Extortion", "definition": "IPC Section 383 (Extortion) corresponds to BNS Section 308. Definition similar.", "status": "mapped"},
    "384": {"bns": "308(2)", "title": "Punishment for extortion", "definition": "IPC Section 384 (Punishment for extortion) corresponds to BNS Section 308(2). Updated punishment.", "status": "mapped"},
    "385": {"bns": "308(3)", "title": "Putting person in fear of injury to commit extortion", "definition": "IPC Section 385 (Putting person in fear of injury to commit extortion) corresponds to BNS Section 308(3). Consolidated.", "status": "mapped"},
    "386": {"bns": "308(4)", "title": "Extortion by putting in fear of death", "definition": "IPC Section 386 (Extortion by putting in fear of death) corresponds to BNS Section 308(4). Enhanced punishment.", "status": "mapped"},
    "387": {"bns": "308(5)", "title": "Putting person in fear of death to commit extortion", "definition": "IPC Section 387 (Putting person in fear of death to commit extortion) corresponds to BNS Section 308(5). Enhanced punishment.", "status": "mapped"},
    "388": {"bns": "308(6)", "title": "Extortion by threat of accusation of offence", "definition": "IPC Section 388 (Extortion by threat of accusation of offence) corresponds to BNS Section 308(6). Updated provisions.", "status": "mapped"},
    "389": {"bns": "308(7)", "title": "Putting person in fear of accusation to commit extortion", "definition": "IPC Section 389 (Putting person in fear of accusation to commit extortion) corresponds to BNS Section 308(7). Updated provisions.", "status": "mapped"},
    "390": {"bns": "309", "title": "Robbery", "definition": "IPC Section 390 (Robbery) corresponds to BNS Section 309. Definition unchanged.", "status": "mapped"},
    "391": {"bns": "309(2)", "title": "Dacoity", "definition": "IPC Section 391 (Dacoity) corresponds to BNS Section 309(2). Definition unchanged - 5 or more persons.", "status": "mapped"},
    "392": {"bns": "309(4)", "title": "Punishment for robbery", "definition": "IPC Section 392 (Punishment for robbery) corresponds to BNS Section 309(4). Enhanced punishment.", "status": "mapped"},
    "393": {"bns": "309(5)", "title": "Attempt to commit robbery", "definition": "IPC Section 393 (Attempt to commit robbery) corresponds to BNS Section 309(5). Updated provisions.", "status": "mapped"},
    "394": {"bns": "309(6)", "title": "Voluntarily causing hurt in committing robbery", "definition": "IPC Section 394 (Voluntarily causing hurt in committing robbery) corresponds to BNS Section 309(6). Enhanced punishment.", "status": "mapped"},
    "395": {"bns": "310", "title": "Punishment for dacoity", "definition": "IPC Section 395 (Punishment for dacoity) corresponds to BNS Section 310. Life imprisonment provisions.", "status": "mapped"},
    "396": {"bns": "310(3)", "title": "Dacoity with murder", "definition": "IPC Section 396 (Dacoity with murder) corresponds to BNS Section 310(3). Death penalty or life imprisonment.", "status": "mapped"},
    "397": {"bns": "311", "title": "Robbery with attempt to cause death", "definition": "IPC Section 397 (Robbery with attempt to cause death) corresponds to BNS Section 311. Enhanced punishment.", "status": "mapped"},
    "398": {"bns": "312", "title": "Attempt to commit robbery when armed", "definition": "IPC Section 398 (Attempt to commit robbery when armed) corresponds to BNS Section 312. Updated provisions.", "status": "mapped"},
    "399": {"bns": "310(4)", "title": "Making preparation to commit dacoity", "definition": "IPC Section 399 (Making preparation to commit dacoity) corresponds to BNS Section 310(4). Updated provisions.", "status": "mapped"},
    "400": {"bns": "310(5)", "title": "Punishment for belonging to gang of dacoits", "definition": "IPC Section 400 (Punishment for belonging to gang of dacoits) corresponds to BNS Section 310(5). Enhanced punishment.", "status": "mapped"},
    "401": {"bns": "310(6)", "title": "Punishment for belonging to gang of thieves", "definition": "IPC Section 401 (Punishment for belonging to gang of thieves) corresponds to BNS Section 310(6). Updated provisions.", "status": "mapped"},
    "402": {"bns": "310(7)", "title": "Assembling for purpose of committing dacoity", "definition": "IPC Section 402 (Assembling for purpose of committing dacoity) corresponds to BNS Section 310(7). Updated provisions.", "status": "mapped"},
    "403": {"bns": "314", "title": "Dishonest misappropriation of property", "definition": "IPC Section 403 (Dishonest misappropriation of property) corresponds to BNS Section 314. Updated punishment.", "status": "mapped"},
    "404": {"bns": "315", "title": "Dishonest misappropriation by deceased person's property", "definition": "IPC Section 404 (Dishonest misappropriation by deceased person's property) corresponds to BNS Section 315. Updated provisions.", "status": "mapped"},
    "405": {"bns": "316", "title": "Criminal breach of trust", "definition": "IPC Section 405 (Criminal breach of trust) corresponds to BNS Section 316. Definition unchanged.", "status": "mapped"},
    "406": {"bns": "316(2)", "title": "Punishment for criminal breach of trust", "definition": "IPC Section 406 (Punishment for criminal breach of trust) corresponds to BNS Section 316(2). Enhanced punishment.", "status": "mapped"},
    "407": {"bns": "316(3)", "title": "Criminal breach of trust by carrier", "definition": "IPC Section 407 (Criminal breach of trust by carrier) corresponds to BNS Section 316(3). Updated provisions.", "status": "mapped"},
    "408": {"bns": "316(4)", "title": "Criminal breach of trust by clerk or servant", "definition": "IPC Section 408 (Criminal breach of trust by clerk or servant) corresponds to BNS Section 316(4). Enhanced punishment.", "status": "mapped"},
    "409": {"bns": "316(5)", "title": "Criminal breach of trust by public servant", "definition": "IPC Section 409 (Criminal breach of trust by public servant) corresponds to BNS Section 316(5). Life imprisonment possible.", "status": "mapped"},
    "410": {"bns": "317", "title": "Stolen property", "definition": "IPC Section 410 (Stolen property) corresponds to BNS Section 317. Definition similar.", "status": "mapped"},
    "411": {"bns": "317(2)", "title": "Dishonestly receiving stolen property", "definition": "IPC Section 411 (Dishonestly receiving stolen property) corresponds to BNS Section 317(2). Updated punishment.", "status": "mapped"},
    "412": {"bns": "317(3)", "title": "Dishonestly receiving property stolen in dacoity", "definition": "IPC Section 412 (Dishonestly receiving property stolen in dacoity) corresponds to BNS Section 317(3). Enhanced punishment.", "status": "mapped"},
    "413": {"bns": "317(4)", "title": "Habitually dealing in stolen property", "definition": "IPC Section 413 (Habitually dealing in stolen property) corresponds to BNS Section 317(4). Life imprisonment possible.", "status": "mapped"},
    "414": {"bns": "317(5)", "title": "Assisting in concealment of stolen property", "definition": "IPC Section 414 (Assisting in concealment of stolen property) corresponds to BNS Section 317(5). Updated provisions.", "status": "mapped"},
    "415": {"bns": "318", "title": "Cheating", "definition": "IPC Section 415 (Cheating) corresponds to BNS Section 318. Definition expanded for digital frauds.", "status": "modified"},
    "416": {"bns": "319", "title": "Cheating by personation", "definition": "IPC Section 416 (Cheating by personation) corresponds to BNS Section 319. Updated provisions.", "status": "mapped"},
    "417": {"bns": "318(2)", "title": "Punishment for cheating", "definition": "IPC Section 417 (Punishment for cheating) corresponds to BNS Section 318(2). Updated punishment.", "status": "mapped"},
    "418": {"bns": "318(3)", "title": "Cheating with knowledge that wrongful loss may ensue", "definition": "IPC Section 418 (Cheating with knowledge that wrongful loss may ensue) corresponds to BNS Section 318(3). Consolidated.", "status": "mapped"},
    "419": {"bns": "319(2)", "title": "Punishment for cheating by personation", "definition": "IPC Section 419 (Punishment for cheating by personation) corresponds to BNS Section 319(2). Enhanced punishment.", "status": "mapped"},
    "420": {"bns": "318(4)", "title": "Cheating and dishonestly inducing delivery of property", "definition": "IPC Section 420 (Cheating and dishonestly inducing delivery of property) corresponds to BNS Section 318(4). Enhanced punishment, includes digital property.", "status": "mapped"},
    "421": {"bns": "320", "title": "Dishonest or fraudulent removal or concealment of property", "definition": "IPC Section 421 (Dishonest or fraudulent removal or concealment of property) corresponds to BNS Section 320. Updated provisions.", "status": "mapped"},
    "422": {"bns": "321", "title": "Dishonestly or fraudulently preventing debt being available", "definition": "IPC Section 422 (Dishonestly or fraudulently preventing debt being available) corresponds to BNS Section 321. Updated provisions.", "status": "mapped"},
    "423": {"bns": "322", "title": "Dishonest or fraudulent execution of deed of transfer", "definition": "IPC Section 423 (Dishonest or fraudulent execution of deed of transfer) corresponds to BNS Section 322. Updated provisions.", "status": "mapped"},
    "424": {"bns": "323", "title": "Dishonest or fraudulent removal or concealment of property", "definition": "IPC Section 424 (Dishonest or fraudulent removal or concealment of property) corresponds to BNS Section 323. Updated provisions.", "status": "mapped"},
    "425": {"bns": "324", "title": "Mischief", "definition": "IPC Section 425 (Mischief) corresponds to BNS Section 324. Definition unchanged.", "status": "mapped"},
    "426": {"bns": "324(2)", "title": "Punishment for mischief", "definition": "IPC Section 426 (Punishment for mischief) corresponds to BNS Section 324(2). Updated punishment.", "status": "mapped"},
    "427": {"bns": "324(3)", "title": "Mischief causing damage to amount of fifty rupees", "definition": "IPC Section 427 (Mischief causing damage to amount of fifty rupees) corresponds to BNS Section 324(3). Amount updated for inflation.", "status": "mapped"},
    "428": {"bns": "325", "title": "Mischief by killing or maiming animal", "definition": "IPC Section 428 (Mischief by killing or maiming animal) corresponds to BNS Section 325. Enhanced punishment.", "status": "mapped"},
    "429": {"bns": "325", "title": "Mischief by killing or maiming cattle", "definition": "IPC Section 429 (Mischief by killing or maiming cattle) corresponds to BNS Section 325. Consolidated with 428.", "status": "mapped"},
    "430": {"bns": "326(a)", "title": "Mischief by injury to irrigation works", "definition": "IPC Section 430 (Mischief by injury to irrigation works) corresponds to BNS Section 326(a). Updated provisions.", "status": "mapped"},
    "431": {"bns": "326(b)", "title": "Mischief by injury to public road", "definition": "IPC Section 431 (Mischief by injury to public road) corresponds to BNS Section 326(b). Updated provisions.", "status": "mapped"},
    "432": {"bns": "326(c)", "title": "Mischief by causing inundation", "definition": "IPC Section 432 (Mischief by causing inundation) corresponds to BNS Section 326(c). Updated provisions.", "status": "mapped"},
    "433": {"bns": "326(d)", "title": "Mischief by destroying or moving lighthouse", "definition": "IPC Section 433 (Mischief by destroying or moving lighthouse) corresponds to BNS Section 326(d). Updated provisions.", "status": "mapped"},
    "434": {"bns": "326(e)", "title": "Mischief by destroying or moving landmark", "definition": "IPC Section 434 (Mischief by destroying or moving landmark) corresponds to BNS Section 326(e). Updated provisions.", "status": "mapped"},
    "435": {"bns": "326(f)", "title": "Mischief by fire or explosive substance", "definition": "IPC Section 435 (Mischief by fire or explosive substance) corresponds to BNS Section 326(f). Enhanced punishment.", "status": "mapped"},
    "436": {"bns": "326(g)", "title": "Mischief by fire on dwelling house", "definition": "IPC Section 436 (Mischief by fire on dwelling house) corresponds to BNS Section 326(g). Life imprisonment possible.", "status": "mapped"},
    "437": {"bns": "327", "title": "Mischief with intent to destroy or make unsafe decked vessel", "definition": "IPC Section 437 (Mischief with intent to destroy or make unsafe decked vessel) corresponds to BNS Section 327. Updated provisions.", "status": "mapped"},
    "438": {"bns": "327", "title": "Mischief to vessel of twenty tons burden", "definition": "IPC Section 438 (Mischief to vessel of twenty tons burden) corresponds to BNS Section 327. Consolidated with 437.", "status": "mapped"},
    "439": {"bns": "328", "title": "Mischief by destroying or moving any land-mark", "definition": "IPC Section 439 (Mischief by destroying or moving any land-mark) corresponds to BNS Section 328. Updated provisions.", "status": "mapped"},
    "440": {"bns": "328", "title": "Mischief committed after preparation", "definition": "IPC Section 440 (Mischief committed after preparation) corresponds to BNS Section 328. Consolidated.", "status": "mapped"},
    "441": {"bns": "329", "title": "Criminal trespass", "definition": "IPC Section 441 (Criminal trespass) corresponds to BNS Section 329. Definition unchanged.", "status": "mapped"},
    "442": {"bns": "329(2)", "title": "House-trespass", "definition": "IPC Section 442 (House-trespass) corresponds to BNS Section 329(2). Definition similar.", "status": "mapped"},
    "443": {"bns": "330", "title": "Lurking house-trespass", "definition": "IPC Section 443 (Lurking house-trespass) corresponds to BNS Section 330. Updated provisions.", "status": "mapped"},
    "444": {"bns": "331", "title": "Lurking house-trespass by night", "definition": "IPC Section 444 (Lurking house-trespass by night) corresponds to BNS Section 331. Enhanced punishment.", "status": "mapped"},
    "445": {"bns": "330(2)", "title": "House-breaking", "definition": "IPC Section 445 (House-breaking) corresponds to BNS Section 330(2). Definition updated.", "status": "mapped"},
    "446": {"bns": "331", "title": "House-breaking by night", "definition": "IPC Section 446 (House-breaking by night) corresponds to BNS Section 331. Enhanced punishment.", "status": "mapped"},
    "447": {"bns": "329(3)", "title": "Punishment for criminal trespass", "definition": "IPC Section 447 (Punishment for criminal trespass) corresponds to BNS Section 329(3). Updated punishment.", "status": "mapped"},
    "448": {"bns": "329(4)", "title": "Punishment for house-trespass", "definition": "IPC Section 448 (Punishment for house-trespass) corresponds to BNS Section 329(4). Updated punishment.", "status": "mapped"},
    "449": {"bns": "332(a)", "title": "House-trespass to commit offence punishable with death", "definition": "IPC Section 449 (House-trespass to commit offence punishable with death) corresponds to BNS Section 332(a). Life imprisonment possible.", "status": "mapped"},
    "450": {"bns": "332(b)", "title": "House-trespass to commit offence punishable with life", "definition": "IPC Section 450 (House-trespass to commit offence punishable with life) corresponds to BNS Section 332(b). Enhanced punishment.", "status": "mapped"},
    "451": {"bns": "332(c)", "title": "House-trespass to commit offence punishable with imprisonment", "definition": "IPC Section 451 (House-trespass to commit offence punishable with imprisonment) corresponds to BNS Section 332(c). Updated provisions.", "status": "mapped"},
    "452": {"bns": "333", "title": "House-trespass after preparation for hurt", "definition": "IPC Section 452 (House-trespass after preparation for hurt) corresponds to BNS Section 333. Enhanced punishment.", "status": "mapped"},
    "453": {"bns": "331", "title": "Punishment for lurking house-trespass", "definition": "IPC Section 453 (Punishment for lurking house-trespass) corresponds to BNS Section 331. Updated punishment.", "status": "mapped"},
    "454": {"bns": "331(3)", "title": "Lurking house-trespass to commit offence", "definition": "IPC Section 454 (Lurking house-trespass to commit offence) corresponds to BNS Section 331(3). Enhanced punishment.", "status": "mapped"},
    "455": {"bns": "331(5)", "title": "Lurking house-trespass after preparation for hurt", "definition": "IPC Section 455 (Lurking house-trespass after preparation for hurt) corresponds to BNS Section 331(5). Enhanced punishment.", "status": "mapped"},
    "456": {"bns": "331(2)", "title": "Lurking house-trespass by night", "definition": "IPC Section 456 (Lurking house-trespass by night) corresponds to BNS Section 331(2). Enhanced punishment.", "status": "mapped"},
    "457": {"bns": "331(4)", "title": "Lurking house-trespass by night to commit offence", "definition": "IPC Section 457 (Lurking house-trespass by night to commit offence) corresponds to BNS Section 331(4). Enhanced punishment.", "status": "mapped"},
    "458": {"bns": "331(6)", "title": "Lurking house-trespass by night after preparation for hurt", "definition": "IPC Section 458 (Lurking house-trespass by night after preparation for hurt) corresponds to BNS Section 331(6). Enhanced punishment.", "status": "mapped"},
    "459": {"bns": "331(7)", "title": "Grievous hurt caused while committing lurking house-trespass", "definition": "IPC Section 459 (Grievous hurt caused while committing lurking house-trespass) corresponds to BNS Section 331(7). Life imprisonment possible.", "status": "mapped"},
    "460": {"bns": "331(8)", "title": "Death or grievous hurt in lurking house-trespass by night", "definition": "IPC Section 460 (Death or grievous hurt in lurking house-trespass by night) corresponds to BNS Section 331(8). Life imprisonment/death penalty.", "status": "mapped"},
    "461": {"bns": "334", "title": "Dishonestly breaking open receptacle", "definition": "IPC Section 461 (Dishonestly breaking open receptacle) corresponds to BNS Section 334. Updated provisions.", "status": "mapped"},
    "462": {"bns": "335", "title": "Punishment for dishonestly breaking open receptacle", "definition": "IPC Section 462 (Punishment for dishonestly breaking open receptacle) corresponds to BNS Section 335. Updated punishment.", "status": "mapped"},
    "463": {"bns": "336", "title": "Forgery", "definition": "IPC Section 463 (Forgery) corresponds to BNS Section 336. Definition expanded to include electronic records.", "status": "modified"},
    "464": {"bns": "335", "title": "Making a false document", "definition": "IPC Section 464 (Making a false document) corresponds to BNS Section 335. Includes electronic records.", "status": "mapped"},
    "465": {"bns": "336(2)", "title": "Punishment for forgery", "definition": "IPC Section 465 (Punishment for forgery) corresponds to BNS Section 336(2). Updated punishment.", "status": "mapped"},
    "466": {"bns": "337", "title": "Forgery of record of Court or public register", "definition": "IPC Section 466 (Forgery of record of Court or public register) corresponds to BNS Section 337. Enhanced punishment, includes Aadhaar.", "status": "mapped"},
    "467": {"bns": "338", "title": "Forgery of valuable security, will", "definition": "IPC Section 467 (Forgery of valuable security, will) corresponds to BNS Section 338. Life imprisonment possible.", "status": "mapped"},
    "468": {"bns": "336(3)", "title": "Forgery for purpose of cheating", "definition": "IPC Section 468 (Forgery for purpose of cheating) corresponds to BNS Section 336(3). Enhanced punishment.", "status": "mapped"},
    "469": {"bns": "336(4)", "title": "Forgery for purpose of harming reputation", "definition": "IPC Section 469 (Forgery for purpose of harming reputation) corresponds to BNS Section 336(4). Updated provisions.", "status": "mapped"},
    "470": {"bns": "340", "title": "Forged document", "definition": "IPC Section 470 (Forged document) corresponds to BNS Section 340. Includes electronic records.", "status": "mapped"},
    "471": {"bns": "340(2)", "title": "Using as genuine a forged document", "definition": "IPC Section 471 (Using as genuine a forged document) corresponds to BNS Section 340(2). Updated punishment.", "status": "mapped"},
    "472": {"bns": "341", "title": "Making or possessing counterfeit seal", "definition": "IPC Section 472 (Making or possessing counterfeit seal) corresponds to BNS Section 341. Enhanced punishment.", "status": "mapped"},
    "473": {"bns": "341(2)", "title": "Making or possessing counterfeit seal (Indian coin)", "definition": "IPC Section 473 (Making or possessing counterfeit seal (Indian coin)) corresponds to BNS Section 341(2). Updated provisions.", "status": "mapped"},
    "474": {"bns": "342", "title": "Having possession of document knowing it to be forged", "definition": "IPC Section 474 (Having possession of document knowing it to be forged) corresponds to BNS Section 342. Updated provisions.", "status": "mapped"},
    "475": {"bns": "342", "title": "Counterfeiting device or mark", "definition": "IPC Section 475 (Counterfeiting device or mark) corresponds to BNS Section 342. Includes electronic signatures.", "status": "mapped"},
    "476": {"bns": "342(2)", "title": "Counterfeiting device (other documents)", "definition": "IPC Section 476 (Counterfeiting device (other documents)) corresponds to BNS Section 342(2). Updated provisions.", "status": "mapped"},
    "477": {"bns": "338", "title": "Fraudulent cancellation or destruction of will", "definition": "IPC Section 477 (Fraudulent cancellation or destruction of will) corresponds to BNS Section 338. Consolidated.", "status": "mapped"},
    "477A": {"bns": "338", "title": "Falsification of accounts", "definition": "IPC Section 477A (Falsification of accounts) corresponds to BNS Section 338. Enhanced for corporate frauds.", "status": "mapped"},
    "478": {"bns": "343", "title": "Trade mark", "definition": "IPC Section 478 (Trade mark) corresponds to BNS Section 343. Definition retained.", "status": "mapped"},
    "479": {"bns": "344", "title": "Property mark", "definition": "IPC Section 479 (Property mark) corresponds to BNS Section 344. Definition retained.", "status": "mapped"},
    "480": {"bns": "345", "title": "Using a false trade mark", "definition": "IPC Section 480 (Using a false trade mark) corresponds to BNS Section 345. Updated provisions.", "status": "mapped"},
    "481": {"bns": "346", "title": "Using a false property mark", "definition": "IPC Section 481 (Using a false property mark) corresponds to BNS Section 346. Updated provisions.", "status": "mapped"},
    "482": {"bns": "347", "title": "Punishment for using false trade mark", "definition": "IPC Section 482 (Punishment for using false trade mark) corresponds to BNS Section 347. Updated punishment.", "status": "mapped"},
    "483": {"bns": "348", "title": "Counterfeiting a trade mark", "definition": "IPC Section 483 (Counterfeiting a trade mark) corresponds to BNS Section 348. Updated provisions.", "status": "mapped"},
    "484": {"bns": "349", "title": "Counterfeiting a property mark", "definition": "IPC Section 484 (Counterfeiting a property mark) corresponds to BNS Section 349. Updated provisions.", "status": "mapped"},
    "485": {"bns": "350", "title": "Making or possession of instrument for counterfeiting trade mark", "definition": "IPC Section 485 (Making or possession of instrument for counterfeiting trade mark) corresponds to BNS Section 350. Updated provisions.", "status": "mapped"},
    "486": {"bns": "350", "title": "Selling goods marked with counterfeit trade mark", "definition": "IPC Section 486 (Selling goods marked with counterfeit trade mark) corresponds to BNS Section 350. Consolidated.", "status": "mapped"},
    "487": {"bns": "350", "title": "Making false mark on receptacle", "definition": "IPC Section 487 (Making false mark on receptacle) corresponds to BNS Section 350. Consolidated.", "status": "mapped"},
    "488": {"bns": "350", "title": "Punishment for making use of false mark", "definition": "IPC Section 488 (Punishment for making use of false mark) corresponds to BNS Section 350. Consolidated.", "status": "mapped"},
    "489": {"bns": "350", "title": "Tampering with property mark", "definition": "IPC Section 489 (Tampering with property mark) corresponds to BNS Section 350. Consolidated.", "status": "mapped"},
    "489A": {"bns": "336", "title": "Counterfeiting currency notes or bank notes", "definition": "IPC Section 489A (Counterfeiting currency notes or bank notes) corresponds to BNS Section 336. Enhanced punishment for currency crimes.", "status": "mapped"},
    "489B": {"bns": "336", "title": "Using as genuine forged or counterfeit currency", "definition": "IPC Section 489B (Using as genuine forged or counterfeit currency) corresponds to BNS Section 336. Consolidated.", "status": "mapped"},
    "489C": {"bns": "336", "title": "Possession of forged or counterfeit currency notes", "definition": "IPC Section 489C (Possession of forged or counterfeit currency notes) corresponds to BNS Section 336. Consolidated.", "status": "mapped"},
    "489D": {"bns": "336", "title": "Making or possessing instruments for counterfeiting currency", "definition": "IPC Section 489D (Making or possessing instruments for counterfeiting currency) corresponds to BNS Section 336. Consolidated.", "status": "mapped"},
    "489E": {"bns": "336", "title": "Making or using documents resembling currency", "definition": "IPC Section 489E (Making or using documents resembling currency) corresponds to BNS Section 336. Consolidated.", "status": "mapped"},
    "493": {"bns": "81", "title": "Cohabitation caused by man deceitfully inducing belief of lawful marriage", "definition": "IPC Section 493 (Cohabitation caused by man deceitfully inducing belief of lawful marriage) corresponds to BNS Section 81. Updated provisions.", "status": "mapped"},
    "494": {"bns": "82", "title": "Marrying again during lifetime of husband or wife", "definition": "IPC Section 494 (Marrying again during lifetime of husband or wife) corresponds to BNS Section 82. Bigamy provisions retained.", "status": "mapped"},
    "495": {"bns": "83", "title": "Same offence with concealment of former marriage", "definition": "IPC Section 495 (Same offence with concealment of former marriage) corresponds to BNS Section 83. Enhanced punishment.", "status": "mapped"},
    "496": {"bns": "84", "title": "Marriage ceremony fraudulently gone through", "definition": "IPC Section 496 (Marriage ceremony fraudulently gone through) corresponds to BNS Section 84. Updated provisions.", "status": "mapped"},
    "497": {"bns": "Repealed", "title": "Adultery", "definition": "This IPC section has been repealed or struck down. Struck down by Supreme Court in 2018.", "status": "repealed"},
    "498": {"bns": "85", "title": "Enticing or taking away or detaining married woman", "definition": "IPC Section 498 (Enticing or taking away or detaining married woman) corresponds to BNS Section 85. Updated provisions.", "status": "mapped"},
    "498A": {"bns": "86", "title": "Husband or relative of husband subjecting woman to cruelty", "definition": "IPC Section 498A (Husband or relative of husband subjecting woman to cruelty) corresponds to BNS Section 86. Dowry harassment - retained with enhancements.", "status": "mapped"},
    "499": {"bns": "356", "title": "Defamation", "definition": "IPC Section 499 (Defamation) corresponds to BNS Section 356. Definition expanded, community service option.", "status": "modified"},
    "500": {"bns": "356(2)", "title": "Punishment for defamation", "definition": "IPC Section 500 (Punishment for defamation) corresponds to BNS Section 356(2). Updated, community service option.", "status": "mapped"},
    "501": {"bns": "356(3)", "title": "Printing or engraving matter known to be defamatory", "definition": "IPC Section 501 (Printing or engraving matter known to be defamatory) corresponds to BNS Section 356(3). Consolidated.", "status": "mapped"},
    "502": {"bns": "356(4)", "title": "Sale of printed matter containing defamatory matter", "definition": "IPC Section 502 (Sale of printed matter containing defamatory matter) corresponds to BNS Section 356(4). Consolidated.", "status": "mapped"},
    "503": {"bns": "351", "title": "Criminal intimidation", "definition": "IPC Section 503 (Criminal intimidation) corresponds to BNS Section 351. Definition unchanged.", "status": "mapped"},
    "504": {"bns": "352", "title": "Intentional insult with intent to provoke breach of peace", "definition": "IPC Section 504 (Intentional insult with intent to provoke breach of peace) corresponds to BNS Section 352. Updated provisions.", "status": "mapped"},
    "505": {"bns": "353", "title": "Statements conducing to public mischief", "definition": "IPC Section 505 (Statements conducing to public mischief) corresponds to BNS Section 353. Includes electronic means, fake news.", "status": "mapped"},
    "506": {"bns": "351(2)", "title": "Punishment for criminal intimidation", "definition": "IPC Section 506 (Punishment for criminal intimidation) corresponds to BNS Section 351(2). Updated punishment.", "status": "mapped"},
    "507": {"bns": "351(4)", "title": "Criminal intimidation by anonymous communication", "definition": "IPC Section 507 (Criminal intimidation by anonymous communication) corresponds to BNS Section 351(4). Consolidated, covers digital threats.", "status": "mapped"},
    "508": {"bns": "354", "title": "Act caused by inducing person to believe Divine displeasure", "definition": "IPC Section 508 (Act caused by inducing person to believe Divine displeasure) corresponds to BNS Section 354. Updated provisions.", "status": "mapped"},
    "509": {"bns": "79", "title": "Word, gesture or act intended to insult modesty of woman", "definition": "IPC Section 509 (Word, gesture or act intended to insult modesty of woman) corresponds to BNS Section 79. Moved to offences against women.", "status": "mapped"},
    "510": {"bns": "355", "title": "Misconduct in public by drunken person", "definition": "IPC Section 510 (Misconduct in public by drunken person) corresponds to BNS Section 355. Community service option.", "status": "mapped"},
    "511": {"bns": "62", "title": "Punishment for attempting to commit offences", "definition": "IPC Section 511 (Punishment for attempting to commit offences) corresponds to BNS Section 62. General provision for attempts - enhanced scope.", "status": "mapped"},
}
@app.get("/api/ipc-to-bns/{ipc_section}")
def get_bns_mapping(ipc_section: str):
    """Get BNS equivalent for an IPC section"""
    mapping = IPC_TO_BNS_DATABASE.get(ipc_section)
    
    if not mapping:
        return {
            "ipc": ipc_section,
            "bns": None,
            "title": "Section not found",
            "definition": "This IPC section is not available in our database. Please verify the section number or check if it exists.",
            "status": "redacted"
        }
    
    return {
        "ipc": ipc_section,
        **mapping
    }

@app.get("/api/ipc-to-bns/all")
def get_all_mappings():
    """Get all IPC to BNS mappings"""
    return [
        {"ipc": ipc, **data}
        for ipc, data in IPC_TO_BNS_DATABASE.items()
    ]

# --- Health Check ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    print("🚀 Starting Maharashtra Cyber Portal Backend...")
    print("📊 Database: SQLite (maha_cyber.db)")
    print("🔗 API Docs: http://localhost:8000/docs")
    print("🌐 CORS: Enabled for frontend")
    uvicorn.run(app, host="0.0.0.0", port=8000)