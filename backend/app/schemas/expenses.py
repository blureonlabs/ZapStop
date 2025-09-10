"""
Driver expenses schemas
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from app.models.expenses import ExpenseStatus

class DriverExpenseBase(BaseModel):
    date: datetime
    expense_type: str
    amount: Decimal
    description: Optional[str] = None
    proof_url: Optional[str] = None

class DriverExpenseCreate(DriverExpenseBase):
    driver_id: str

class DriverExpenseUpdate(BaseModel):
    expense_type: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    proof_url: Optional[str] = None
    status: Optional[ExpenseStatus] = None

class DriverExpenseResponse(DriverExpenseBase):
    id: str
    driver_id: str
    status: ExpenseStatus
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
