#!/usr/bin/env python3
"""
Test database structure for leave_requests table
"""

import os
import sys
sys.path.append('/Users/hari/Desktop/Blureon/zap-stop/backend')

from app.database import get_db
from sqlalchemy import text

def test_database_structure():
    """Test if leave_requests table exists and what columns it has"""
    db = next(get_db())
    
    try:
        # Check if table exists
        result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'leave_requests'
        """))
        tables = result.fetchall()
        print(f"Tables found: {tables}")
        
        if tables:
            # Check table structure
            result = db.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'leave_requests'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            print(f"Columns in leave_requests table:")
            for col in columns:
                print(f"  {col[0]}: {col[1]} (nullable: {col[2]})")
            
            # Check if enums exist
            result = db.execute(text("""
                SELECT typname 
                FROM pg_type 
                WHERE typname IN ('leave_type', 'leave_status')
            """))
            enums = result.fetchall()
            print(f"Enum types found: {enums}")
            
            # Try a simple select
            result = db.execute(text("SELECT COUNT(*) FROM leave_requests"))
            count = result.fetchone()
            print(f"Number of records in leave_requests: {count[0]}")
            
        else:
            print("❌ leave_requests table does not exist!")
            
    except Exception as e:
        print(f"❌ Database error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_database_structure()
