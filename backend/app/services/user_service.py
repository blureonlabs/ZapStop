"""
User service
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import AuthService

class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.auth_service = AuthService(db)
    
    def get_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users"""
        return self.db.query(User).offset(skip).limit(limit).all()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def create_user(self, user: UserCreate) -> User:
        """Create new user"""
        hashed_password = self.auth_service.get_password_hash(user.password)
        
        db_user = User(
            email=user.email,
            password_hash=hashed_password,
            name=user.name,
            role=user.role,
            phone=user.phone
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def update_user(self, user_id: str, user_update: UserUpdate) -> User:
        """Update user"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return None
        
        update_data = user_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user"""
        db_user = self.get_user_by_id(user_id)
        if not db_user:
            return False
        
        self.db.delete(db_user)
        self.db.commit()
        return True
