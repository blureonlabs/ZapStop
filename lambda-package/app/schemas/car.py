"""
Car schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class CarBase(BaseModel):
    plate_number: str
    model: str
    monthly_due: Decimal

class CarCreate(CarBase):
    assigned_driver_id: Optional[str] = None
    owner_id: Optional[str] = None

class CarUpdate(BaseModel):
    plate_number: Optional[str] = None
    model: Optional[str] = None
    monthly_due: Optional[Decimal] = None
    assigned_driver_id: Optional[str] = None
    owner_id: Optional[str] = None

class CarResponse(CarBase):
    id: str
    assigned_driver_id: Optional[str] = None
    owner_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
