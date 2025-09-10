"""
Attendance schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.attendance import AttendanceStatus

class AttendanceBase(BaseModel):
    date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT

class AttendanceCreate(AttendanceBase):
    driver_id: str

class AttendanceUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[AttendanceStatus] = None

class AttendanceResponse(AttendanceBase):
    id: str
    driver_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
