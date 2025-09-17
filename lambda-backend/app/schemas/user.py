"""
User schemas
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
from typing import Union

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Union[UserRole, str]
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    assigned_car_id: Optional[str] = None

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    role: Optional[Union[UserRole, str]] = None
    phone: Optional[str] = None
    assigned_car_id: Optional[str] = None

class UserResponse(UserBase):
    id: str
    assigned_car_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str
