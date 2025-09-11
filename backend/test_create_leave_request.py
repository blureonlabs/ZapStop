#!/usr/bin/env python3
"""
Test creating leave request directly
"""

import os
import sys
sys.path.append('/Users/hari/Desktop/Blureon/zap-stop/backend')

from app.database import get_db
from sqlalchemy import text
from datetime import datetime, timedelta

def test_create_leave_request():
    """Test creating leave request directly"""
    db = next(get_db())
    
    try:
        # Get a driver ID first
        result = db.execute(text("SELECT id FROM users WHERE role = 'driver' LIMIT 1"))
        driver_row = result.fetchone()
        if not driver_row:
            print("❌ No driver found")
            return
        
        driver_id = str(driver_row[0])
        print(f"Using driver ID: {driver_id}")
        
        # Test creating leave request
        result = db.execute(text("""
            INSERT INTO leave_requests (
                driver_id, leave_type, start_date, end_date, reason, status, created_at, updated_at
            )
            VALUES (
                :driver_id, :leave_type, :start_date, :end_date, :reason, :status, NOW(), NOW()
            )
            RETURNING id, driver_id, leave_type, start_date, end_date, reason, status, approved_by, created_at, updated_at
        """), {
            "driver_id": driver_id,
            "leave_type": "sick",
            "start_date": datetime.now(),
            "end_date": datetime.now() + timedelta(days=1),
            "reason": "Test leave request",
            "status": "pending"
        })
        
        row = result.fetchone()
        db.commit()
        print(f"✅ Created leave request: {row}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_create_leave_request()
