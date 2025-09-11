#!/usr/bin/env python3
"""
Direct test of login functionality without ORM relationships
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.config import settings
from passlib.context import CryptContext
from sqlalchemy import text

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_login_direct():
    """Test login functionality directly with SQL"""
    
    try:
        with engine.connect() as conn:
            # Test 1: Check if admin user exists
            print("Testing admin user retrieval...")
            result = conn.execute(text("SELECT id, email, password_hash, name, role FROM users WHERE email = 'admin@gmail.com'"))
            admin_user = result.fetchone()
            
            if admin_user:
                print("✅ Admin user found in database!")
                print(f"   Email: {admin_user[1]}")
                print(f"   Name: {admin_user[3]}")
                print(f"   Role: {admin_user[4]}")
                print(f"   Password hash: {admin_user[2][:20]}...")
            else:
                print("❌ Admin user not found in database!")
                return
            
            # Test 2: Verify password
            print("\nTesting password verification...")
            is_valid = pwd_context.verify("admin", admin_user[2])
            print(f"Password verification: {'✅ Valid' if is_valid else '❌ Invalid'}")
            
            if is_valid:
                print("\n✅ Admin login test successful!")
                print("   You can now use these credentials to login:")
                print("   Email: admin@gmail.com")
                print("   Password: admin")
            else:
                print("\n❌ Password verification failed!")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_login_direct()
