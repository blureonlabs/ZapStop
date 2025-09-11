"""
Driver expenses schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DriverExpenseBase(BaseModel):
    date: datetime
    expense_type: str
    amount: float
    description: Optional[str] = None
    proof_url: Optional[str] = None

class DriverExpenseCreate(DriverExpenseBase):
    driver_id: str
    status: str = "pending"

class DriverExpenseUpdate(BaseModel):
    expense_type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    proof_url: Optional[str] = None
    status: Optional[str] = None

class DriverExpenseResponse(DriverExpenseBase):
    id: str
    driver_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
