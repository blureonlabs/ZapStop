#!/usr/bin/env python3
"""
Simple test server with working authentication
"""

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db, engine, Base
from app.schemas.auth import Token, TokenData
from app.services.auth_service_simple import AuthServiceSimple
from app.config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ZapStop API - Test Server",
    description="Test server with working authentication",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ZapStop API Test Server is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "zapstop-api-test"
    }

@app.post("/api/auth/login", response_model=Token, summary="User Login", description="Authenticate user and get access token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login endpoint for user authentication.
    
    - **username**: User's email address
    - **password**: User's password
    
    Returns access token and refresh token for authenticated requests.
    """
    auth_service = AuthServiceSimple(db)
    
    user = auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth_service.create_access_token(data={"sub": user["email"]})
    refresh_token = auth_service.create_refresh_token(data={"sub": user["email"]})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@app.get("/api/auth/me", summary="Get Current User", description="Get information about the currently authenticated user")
async def get_current_user_info(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get current user information.
    
    Returns the details of the currently authenticated user including:
    - User ID, name, email, role
    - Account creation and update timestamps
    """
    auth_service = AuthServiceSimple(db)
    
    try:
        token_data = auth_service.verify_token(token)
        user = auth_service.get_user_by_email(token_data.email)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

@app.post("/api/auth/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Successfully logged out"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "test_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
