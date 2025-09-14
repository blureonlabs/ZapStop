"""
Owner schemas
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class OwnerBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None

class OwnerCreate(OwnerBase):
    documents: Optional[Dict[str, Any]] = None
    document_expiry_date: Optional[datetime] = None

class OwnerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    documents: Optional[Dict[str, Any]] = None
    document_expiry_date: Optional[datetime] = None

class OwnerResponse(OwnerBase):
    id: str
    documents: Optional[Dict[str, Any]] = None
    document_expiry_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
