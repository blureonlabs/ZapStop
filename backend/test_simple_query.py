#!/usr/bin/env python3
"""
Test simple query for leave_requests
"""

import os
import sys
sys.path.append('/Users/hari/Desktop/Blureon/zap-stop/backend')

from app.database import get_db
from sqlalchemy import text

def test_simple_query():
    """Test simple query without joins"""
    db = next(get_db())
    
    try:
        # Test simple select
        result = db.execute(text("""
            SELECT id, driver_id, leave_type, start_date, end_date, reason, status
            FROM leave_requests
            LIMIT 1
        """))
        row = result.fetchone()
        print(f"Simple query result: {row}")
        
        # Test with joins
        result = db.execute(text("""
            SELECT 
                lr.id, lr.driver_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
                lr.approved_by, lr.approved_at, lr.created_at, lr.updated_at,
                u.name as driver_name, u.email as driver_email
            FROM leave_requests lr
            JOIN users u ON lr.driver_id = u.id
            LIMIT 1
        """))
        row = result.fetchone()
        print(f"Join query result: {row}")
        
    except Exception as e:
        print(f"❌ Query error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_simple_query()
