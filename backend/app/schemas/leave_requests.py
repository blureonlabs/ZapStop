"""
Leave requests schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LeaveRequestBase(BaseModel):
    leave_type: str
    start_date: datetime
    end_date: datetime
    reason: str

class LeaveRequestCreate(LeaveRequestBase):
    driver_id: str
    status: str = "pending"

class LeaveRequestUpdate(BaseModel):
    leave_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[str] = None
    admin_notes: Optional[str] = None
    approved_by: Optional[str] = None

class LeaveRequestResponse(LeaveRequestBase):
    id: str
    driver_id: str
    status: str
    admin_notes: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
