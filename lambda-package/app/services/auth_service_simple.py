"""
Simplified Authentication service that bypasses ORM relationships
"""

from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status

from app.config import settings
from app.schemas.auth import TokenData

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email using direct SQL"""
        result = self.db.execute(text("SELECT id, email, password_hash, name, role FROM users WHERE email = :email"), {"email": email})
        user_row = result.fetchone()
        
        if user_row:
            return {
                "id": str(user_row[0]),
                "email": user_row[1],
                "password_hash": user_row[2],
                "name": user_row[3],
                "role": user_row[4]
            }
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID using direct SQL"""
        result = self.db.execute(text("SELECT id, email, password_hash, name, role FROM users WHERE id = :user_id"), {"user_id": user_id})
        user_row = result.fetchone()
        
        if user_row:
            return {
                "id": str(user_row[0]),
                "email": user_row[1],
                "password_hash": user_row[2],
                "name": user_row[3],
                "role": user_row[4]
            }
        return None
    
    def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        """Authenticate a user"""
        user = self.get_user_by_email(email)
        if not user:
            return None
        if not self.verify_password(password, user["password_hash"]):
            return None
        return user
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict):
        """Create refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.jwt_refresh_secret, algorithm=settings.jwt_algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> TokenData:
        """Verify and decode token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
            token_data = TokenData(email=email)
        except JWTError:
            raise credentials_exception
        
        return token_data
    
    def verify_refresh_token(self, token: str) -> TokenData:
        """Verify and decode refresh token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, settings.jwt_refresh_secret, algorithms=[settings.jwt_algorithm])
            email: str = payload.get("sub")
            if email is None:
                raise credentials_exception
            token_data = TokenData(email=email)
        except JWTError:
            raise credentials_exception
        
        return token_data
