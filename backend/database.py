import os
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ai_home_shield")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    api_key = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    devices = relationship("Device", back_populates="tenant")
    incidents = relationship("Incident", back_populates="tenant")

class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    ip = Column(String, index=True)
    mac = Column(String)
    hostname = Column(String)
    device_type = Column(String)
    risk_score = Column(Float, default=0.0)
    last_seen = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(JSON) # Ports, services, etc.
    
    tenant = relationship("Tenant", back_populates="devices")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    ts = Column(DateTime, default=datetime.utcnow)
    trigger_type = Column(String)
    threat_assessment = Column(JSON)
    action_plan = Column(JSON)
    outcome = Column(JSON)
    severity = Column(String)
    
    tenant = relationship("Tenant", back_populates="incidents")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
