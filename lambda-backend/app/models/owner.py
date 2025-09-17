"""
Owner model and related tables
"""

from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime

class Owner(Base):
    __tablename__ = "owners"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20))
    address = Column(Text)
    documents = Column(JSONB)
    document_expiry_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cars = relationship("Car", back_populates="owner")
    owner_cars = relationship("OwnerCar", back_populates="owner")

class OwnerCar(Base):
    __tablename__ = "owner_cars"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("owners.id"), nullable=False)
    car_id = Column(UUID(as_uuid=True), ForeignKey("cars.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship("Owner", back_populates="owner_cars")
    car = relationship("Car", back_populates="owner_cars")
