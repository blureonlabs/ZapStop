"""
Driver earnings model
"""

from sqlalchemy import Column, String, DateTime, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime

class DriverEarning(Base):
    __tablename__ = "driver_earnings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    uber_cash = Column(Numeric(10, 2), default=0)
    uber_account = Column(Numeric(10, 2), default=0)
    bolt_cash = Column(Numeric(10, 2), default=0)
    bolt_account = Column(Numeric(10, 2), default=0)
    uber_rides_count = Column(Integer, default=0)
    bolt_rides_count = Column(Integer, default=0)
    individual_rides_count = Column(Integer, default=0)
    individual_rides_cash = Column(Numeric(10, 2), default=0)
    individual_rides_account = Column(Numeric(10, 2), default=0)
    notes = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    driver = relationship("User", back_populates="earnings")
