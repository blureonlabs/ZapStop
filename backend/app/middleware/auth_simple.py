"""
Simple Authentication middleware that works with AuthServiceSimple
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.services.auth_service_simple import AuthServiceSimple

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    auth_service = AuthServiceSimple(db)
    
    try:
        token_data = auth_service.verify_token(token)
        user = auth_service.get_user_by_email(token_data.email)
        if user is None:
            raise credentials_exception
        return user
    except Exception:
        raise credentials_exception

async def get_current_active_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """Get current active user"""
    # Add any additional checks for active users here
    return current_user
