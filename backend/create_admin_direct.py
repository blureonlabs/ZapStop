#!/usr/bin/env python3
"""
Direct SQL script to create admin user in the database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine
from app.config import settings
from passlib.context import CryptContext
import uuid
from datetime import datetime

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """Create admin user directly in the database"""
    
    try:
        # Hash the password
        hashed_password = pwd_context.hash("admin")
        user_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Check if admin user already exists
        with engine.connect() as conn:
            from sqlalchemy import text
            
            result = conn.execute(text("SELECT id, email FROM users WHERE email = 'admin@gmail.com'"))
            existing = result.fetchone()
            
            if existing:
                print("❌ Admin user already exists!")
                print(f"   Email: {existing[1]}")
                print(f"   User ID: {existing[0]}")
                return
            
            # Insert admin user directly
            conn.execute(text(f"""
                INSERT INTO users (id, email, password_hash, name, role, phone, created_at, updated_at)
                VALUES ('{user_id}', 'admin@gmail.com', '{hashed_password}', 'Admin User', 'admin', '+1234567890', '{now}', '{now}')
            """))
            conn.commit()
            
            print("✅ Admin user created successfully!")
            print(f"   Email: admin@gmail.com")
            print(f"   Name: Admin User")
            print(f"   Role: admin")
            print(f"   User ID: {user_id}")
            print(f"   Password: admin")
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_admin_user()
