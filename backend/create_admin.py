#!/usr/bin/env python3
"""
Script to create admin user in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.owner import Owner
from app.schemas.user import UserCreate
from app.services.auth_service import AuthService
from app.config import settings

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
            return
        
        # Create auth service instance
        auth_service = AuthService()
        
        # Create admin user data
        admin_data = UserCreate(
            email="admin@gmail.com",
            password="admin",
            first_name="Admin",
            last_name="User",
            role="admin",
            phone_number="+1234567890",
            is_active=True
        )
        
        # Hash password and create user
        hashed_password = auth_service.get_password_hash(admin_data.password)
        
        admin_user = User(
            email=admin_data.email,
            hashed_password=hashed_password,
            first_name=admin_data.first_name,
            last_name=admin_data.last_name,
            role=admin_data.role,
            phone_number=admin_data.phone_number,
            is_active=admin_data.is_active
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"   Email: {admin_user.email}")
        print(f"   Role: {admin_user.role}")
        print(f"   User ID: {admin_user.id}")
        
        # Also create an owner record for the admin
        owner = Owner(
            user_id=admin_user.id,
            business_name="ZapStop Admin",
            business_type="Rental Car Management",
            address="123 Admin Street",
            city="Admin City",
            state="AC",
            zip_code="12345",
            country="USA",
            tax_id="12-3456789",
            is_active=True
        )
        
        db.add(owner)
        db.commit()
        db.refresh(owner)
        
        print("✅ Owner record created for admin!")
        print(f"   Business Name: {owner.business_name}")
        print(f"   Owner ID: {owner.id}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
