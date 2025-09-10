"""
User model and related enums
"""

from sqlalchemy import Column, String, DateTime, Enum, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from enum import Enum as PyEnum
from datetime import datetime

class UserRole(PyEnum):
    ADMIN = "admin"
    ACCOUNTANT = "accountant"
    DRIVER = "driver"
    OWNER = "owner"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    phone = Column(String(20))
    assigned_car_id = Column(UUID(as_uuid=True), ForeignKey("cars.id"))
    documents = Column(JSONB)
    document_expiry_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_car = relationship("Car", back_populates="assigned_driver")
    earnings = relationship("DriverEarning", back_populates="driver")
    expenses = relationship("DriverExpense", back_populates="driver")
    attendance = relationship("Attendance", back_populates="driver")
    leave_requests = relationship("LeaveRequest", back_populates="driver")
    approved_leave_requests = relationship("LeaveRequest", back_populates="approved_by", foreign_keys="LeaveRequest.approved_by")
