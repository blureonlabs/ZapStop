"""
Driver earnings schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class DriverEarningBase(BaseModel):
    date: datetime
    uber_cash: Decimal = 0
    uber_account: Decimal = 0
    bolt_cash: Decimal = 0
    bolt_account: Decimal = 0
    uber_rides_count: int = 0
    bolt_rides_count: int = 0
    individual_rides_count: int = 0
    individual_rides_cash: Decimal = 0
    individual_rides_account: Decimal = 0
    notes: Optional[str] = None

class DriverEarningCreate(DriverEarningBase):
    driver_id: str

class DriverEarningUpdate(BaseModel):
    uber_cash: Optional[Decimal] = None
    uber_account: Optional[Decimal] = None
    bolt_cash: Optional[Decimal] = None
    bolt_account: Optional[Decimal] = None
    uber_rides_count: Optional[int] = None
    bolt_rides_count: Optional[int] = None
    individual_rides_count: Optional[int] = None
    individual_rides_cash: Optional[Decimal] = None
    individual_rides_account: Optional[Decimal] = None
    notes: Optional[str] = None

class DriverEarningResponse(DriverEarningBase):
    id: str
    driver_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
