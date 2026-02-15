from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uvicorn
import httpx
import os

# SQLAlchemy imports
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Case, Evidence

# --- Database Setup (SQLite for local testing) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./maha_cyber.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables in the database file
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Maha Cyber API")

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change to ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency: Get Database Session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Pydantic Schemas (For API Validation) ---
class CaseCreate(BaseModel):
    id: str
    title: str
    description: str
    status: str = "Investigation Pending"

class EvidenceCreate(BaseModel):
    category: str
    collectedDate: str
    collectedFrom: str
    location: str
    documentName: Optional[str] = None
    deviceType: Optional[str] = None
    identifyingInfo: Optional[str] = None

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Maharashtra Cyber Portal API", "status": "running"}

@app.post("/api/cases")
def create_case(case: CaseCreate, db: Session = Depends(get_db)):
    """Create a new case"""
    db_case = db.query(Case).filter(Case.id == case.id).first()
    if db_case:
        raise HTTPException(status_code=400, detail="Case ID already exists")
    
    new_case = Case(
        id=case.id, 
        title=case.title,
        description=case.description,
        status=case.status
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return {"message": "Case created successfully", "id": new_case.id}

@app.get("/api/cases")
def get_all_cases(db: Session = Depends(get_db)):
    """Get all cases with their evidence count"""
    cases = db.query(Case).all()
    result = []
    for c in cases:
        result.append({
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "status": c.status,
            "lastUpdated": c.created_at.strftime("%Y-%m-%d"),
            "itemsCount": len(c.evidences)
        })
    return result

@app.get("/api/cases/{case_id}")
def get_case_details(case_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a specific case"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    return {
        "id": case.id,
        "title": case.title,
        "description": case.description,
        "status": case.status,
        "created_at": case.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        "evidence_count": len(case.evidences)
    }

@app.post("/api/cases/{case_id}/evidence")
def add_evidence(case_id: str, ev: EvidenceCreate, db: Session = Depends(get_db)):
    """Add evidence to a specific case"""
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    new_evidence = Evidence(
        case_id=case_id,
        category=ev.category,
        collectedDate=ev.collectedDate,
        collectedFrom=ev.collectedFrom,
        location=ev.location,
        documentName=ev.documentName,
        deviceType=ev.deviceType,
        identifyingInfo=ev.identifyingInfo,
        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(new_evidence)
    db.commit()
    db.refresh(new_evidence)
    return {"status": "success", "evidence_id": new_evidence.id}

@app.get("/api/cases/{case_id}/evidence")
def get_case_evidence(case_id: str, db: Session = Depends(get_db)):
    """Get all evidence for a specific case"""
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    evidence_list = db.query(Evidence).filter(
        Evidence.case_id == case_id
    ).order_by(Evidence.id.desc()).all()
    
    # Format it exactly as the React frontend expects
    return [{
        "id": f"EVD-{e.id}",
        "category": e.category,
        "collectedDate": e.collectedDate,
        "collectedFrom": e.collectedFrom,
        "location": e.location,
        "documentName": e.documentName,
        "deviceType": e.deviceType,
        "identifyingInfo": e.identifyingInfo,
        "timestamp": e.timestamp
    } for e in evidence_list]

@app.delete("/api/cases/{case_id}")
def delete_case(case_id: str, db: Session = Depends(get_db)):
    """Delete a case and all its evidence"""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    db.delete(case)
    db.commit()
    return {"message": "Case deleted successfully"}

# --- NEWS API Integration ---
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