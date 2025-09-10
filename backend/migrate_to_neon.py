#!/usr/bin/env python3
"""
Database migration script for Neon PostgreSQL
Run this script to create all tables in your Neon database
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import Base, engine
from app.models import user, car, earnings, expenses, attendance, leave_request

def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {e}")
        return False

def create_tables():
    """Create all tables"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
        return True
    except SQLAlchemyError as e:
        print(f"❌ Table creation failed: {e}")
        return False

def verify_tables():
    """Verify that tables were created"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result]
            print(f"✅ Found {len(tables)} tables: {', '.join(tables)}")
            return True
    except SQLAlchemyError as e:
        print(f"❌ Table verification failed: {e}")
        return False

def main():
    """Main migration function"""
    print("🚀 Starting Neon database migration...")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')}")
    
    # Test connection
    if not test_connection():
        sys.exit(1)
    
    # Create tables
    if not create_tables():
        sys.exit(1)
    
    # Verify tables
    if not verify_tables():
        sys.exit(1)
    
    print("🎉 Migration completed successfully!")
    print("You can now start your FastAPI server and access the API at http://localhost:8000/docs")

if __name__ == "__main__":
    main()
