#!/usr/bin/env python3
"""
Test script to verify admin user and login
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services.auth_service import AuthService
from app.models.user import User

def test_admin_user():
    """Test admin user retrieval and authentication"""
    
    db = SessionLocal()
    
    try:
        # Test direct database query
        print("Testing direct database query...")
        admin_user = db.query(User).filter(User.email == "admin@gmail.com").first()
        
        if admin_user:
            print("✅ Admin user found in database!")
            print(f"   Email: {admin_user.email}")
            print(f"   Name: {admin_user.name}")
            print(f"   Role: {admin_user.role}")
            print(f"   Password hash: {admin_user.password_hash[:20]}...")
        else:
            print("❌ Admin user not found in database!")
            return
        
        # Test authentication
        print("\nTesting authentication...")
        auth_service = AuthService(db)
        
        # Test password verification
        is_valid = auth_service.verify_password("admin", admin_user.password_hash)
        print(f"Password verification: {'✅ Valid' if is_valid else '❌ Invalid'}")
        
        # Test full authentication
        authenticated_user = auth_service.authenticate_user("admin@gmail.com", "admin")
        if authenticated_user:
            print("✅ Authentication successful!")
            print(f"   Authenticated user: {authenticated_user.email}")
        else:
            print("❌ Authentication failed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_admin_user()
