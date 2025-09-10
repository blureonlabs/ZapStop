"""
Car model
"""

from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime

class Car(Base):
    __tablename__ = "cars"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plate_number = Column(String(20), unique=True, nullable=False, index=True)
    model = Column(String(255), nullable=False)
    monthly_due = Column(Numeric(10, 2), nullable=False)
    assigned_driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    owner_id = Column(UUID(as_uuid=True), ForeignKey("owners.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_driver = relationship("User", back_populates="assigned_car")
    owner = relationship("Owner", back_populates="cars")
    owner_cars = relationship("OwnerCar", back_populates="car")
