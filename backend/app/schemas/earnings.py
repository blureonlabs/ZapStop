"""
Driver earnings schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DriverEarningBase(BaseModel):
    date: datetime
    uber_cash: float = 0
    uber_account: float = 0
    bolt_cash: float = 0
    bolt_account: float = 0
    uber_rides_count: int = 0
    bolt_rides_count: int = 0
    individual_rides_count: int = 0
    individual_rides_cash: float = 0
    individual_rides_account: float = 0
    notes: Optional[str] = None

class DriverEarningCreate(DriverEarningBase):
    driver_id: str

class DriverEarningUpdate(BaseModel):
    uber_cash: Optional[float] = None
    uber_account: Optional[float] = None
    bolt_cash: Optional[float] = None
    bolt_account: Optional[float] = None
    uber_rides_count: Optional[int] = None
    bolt_rides_count: Optional[int] = None
    individual_rides_count: Optional[int] = None
    individual_rides_cash: Optional[float] = None
    individual_rides_account: Optional[float] = None
    notes: Optional[str] = None

class DriverEarningResponse(DriverEarningBase):
    id: str
    driver_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
