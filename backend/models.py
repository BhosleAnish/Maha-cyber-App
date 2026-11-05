from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    badge_number = Column(String, unique=True, index=True)
    role = Column(String)

class Case(Base):
    __tablename__ = "cases"
    id = Column(String, primary_key=True, index=True) 
    title = Column(String)
    status = Column(String, default="Evidence Collection")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    evidences = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    correlations = relationship("Correlation", back_populates="case", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidences"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    
    # Core fields
    category = Column(String) # 'electronic', 'document', 'other'
    collectedDate = Column(String)
    collectedFrom = Column(String)
    location = Column(String)
    timestamp = Column(String)
    
    # Conditional fields (Nullable)
    documentName = Column(String, nullable=True)
    deviceType = Column(String, nullable=True)
    identifyingInfo = Column(String, nullable=True)
    
    case = relationship("Case", back_populates="evidences")

class Correlation(Base):
    __tablename__ = "correlations"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey("cases.id"))
    
    # Correlation fields
    from_evidence = Column(String)  # Evidence ID (e.g., "EVD-1")
    to_evidence = Column(String)    # Evidence ID (e.g., "EVD-2")
    relationshipType = Column(String)  # "Related to", "Found with", etc.
    description = Column(Text, nullable=True)  # Optional description
    created_at = Column(DateTime, default=datetime.utcnow)
    
    case = relationship("Case", back_populates="correlations")

class Officer(Base):
    """Portal login account (email + password; MFA via emailed OTP)."""
    __tablename__ = "officers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    badge_number = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class LoginOtp(Base):
    """One pending MFA challenge. The OTP itself is stored only as a hash."""
    __tablename__ = "login_otps"
    id = Column(String, primary_key=True)  # random challenge id
    officer_id = Column(Integer, ForeignKey("officers.id"), index=True)
    otp_hash = Column(String)
    expires_at = Column(DateTime)
    attempts = Column(Integer, default=0)
    used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
