"""
Leave requests schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.leave_requests import LeaveType, LeaveStatus

class LeaveRequestBase(BaseModel):
    leave_type: LeaveType
    start_date: datetime
    end_date: datetime
    reason: str

class LeaveRequestCreate(LeaveRequestBase):
    driver_id: str

class LeaveRequestUpdate(BaseModel):
    leave_type: Optional[LeaveType] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[LeaveStatus] = None
    admin_notes: Optional[str] = None

class LeaveRequestResponse(LeaveRequestBase):
    id: str
    driver_id: str
    status: LeaveStatus
    admin_notes: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
