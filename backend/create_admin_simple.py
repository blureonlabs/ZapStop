#!/usr/bin/env python3
"""
Simple script to create admin user in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.config import settings
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create admin user in the database"""
    
    # Create database tables if they don't exist
    from app.database import Base
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == "admin@gmail.com").first()
        if existing_admin:
            print("❌ Admin user already exists!")
            print(f"   Email: {existing_admin.email}")
            print(f"   Role: {existing_admin.role}")
            print(f"   User ID: {existing_admin.id}")
            return
        
        # Hash the password
        hashed_password = pwd_context.hash("admin")
        
        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@gmail.com",
            password_hash=hashed_password,
            name="Admin User",
            role=UserRole.ADMIN,
            phone="+1234567890",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Name: {admin_user.name}")
        print(f"   Role: {admin_user.role}")
        print(f"   User ID: {admin_user.id}")
        print(f"   Password: admin")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
