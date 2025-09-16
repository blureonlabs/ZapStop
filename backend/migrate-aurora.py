#!/usr/bin/env python3
"""
Database Migration Script for Aurora Serverless v2
This script migrates the database schema to Aurora
"""

import os
import sys
import json
import boto3
from sqlalchemy import create_engine, text
from botocore.exceptions import ClientError

def get_aurora_connection():
    """Get Aurora connection details from AWS Secrets Manager"""
    try:
        # Get region from environment or default to me-central-1
        region = os.getenv('AWS_REGION', 'me-central-1')
        
        # Create Secrets Manager client
        secrets_client = boto3.client('secretsmanager', region_name=region)
        
        # Get database credentials
        secret_name = os.getenv('DB_SECRET_NAME', 'zapstop/aurora/credentials')
        response = secrets_client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response['SecretString'])
        
        # Construct connection string
        connection_string = (
            f"postgresql://{secret['username']}:{secret['password']}"
            f"@{secret['host']}:{secret['port']}/{secret['dbname']}"
        )
        
        # Add SSL parameters
        if secret.get('sslmode', 'require') == 'require':
            connection_string += "?sslmode=require"
        
        return connection_string, secret
        
    except ClientError as e:
        print(f"Error retrieving secret: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error getting Aurora connection: {e}")
        sys.exit(1)

def create_tables(engine):
    """Create all database tables"""
    try:
        # Import all models to ensure they're registered
        from app.models.user import User
        from app.models.car import Car
        from app.models.owner import Owner
        from app.models.earning import Earning
        from app.models.expense import Expense
        from app.models.attendance import Attendance
        from app.models.leave_request import LeaveRequest
        
        # Create all tables
        from app.database_aurora import Base
        Base.metadata.create_all(bind=engine)
        
        print("✅ Database tables created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

def insert_initial_data(engine, secret):
    """Insert initial data (admin user, etc.)"""
    try:
        with engine.connect() as conn:
            # Check if admin user exists
            result = conn.execute(text("SELECT COUNT(*) FROM users WHERE email = 'admin@zapstop.com'"))
            admin_count = result.scalar()
            
            if admin_count == 0:
                # Insert admin user
                admin_data = {
                    'name': 'Admin User',
                    'email': 'admin@zapstop.com',
                    'password_hash': '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/4.5.2',  # admin123
                    'role': 'admin',
                    'phone': '+971501234567',
                    'is_active': True
                }
                
                conn.execute(text("""
                    INSERT INTO users (name, email, password_hash, role, phone, is_active, created_at, updated_at)
                    VALUES (:name, :email, :password_hash, :role, :phone, :is_active, NOW(), NOW())
                """), admin_data)
                
                conn.commit()
                print("✅ Admin user created successfully")
                print("   Email: admin@zapstop.com")
                print("   Password: admin123")
            else:
                print("ℹ️  Admin user already exists")
        
        return True
        
    except Exception as e:
        print(f"❌ Error inserting initial data: {e}")
        return False

def test_connection(engine):
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ Database connection successful")
            print(f"   PostgreSQL version: {version}")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def main():
    """Main migration function"""
    print("🚀 ZapStop Aurora Database Migration")
    print("===================================")
    
    # Get Aurora connection
    print("📡 Getting Aurora connection details...")
    connection_string, secret = get_aurora_connection()
    print(f"   Host: {secret['host']}")
    print(f"   Database: {secret['dbname']}")
    print(f"   Username: {secret['username']}")
    
    # Create engine
    print("🔧 Creating database engine...")
    engine = create_engine(connection_string, echo=False)
    
    # Test connection
    print("🧪 Testing database connection...")
    if not test_connection(engine):
        sys.exit(1)
    
    # Create tables
    print("🏗️  Creating database tables...")
    if not create_tables(engine):
        sys.exit(1)
    
    # Insert initial data
    print("📝 Inserting initial data...")
    if not insert_initial_data(engine, secret):
        sys.exit(1)
    
    print("")
    print("🎉 Database migration completed successfully!")
    print("")
    print("📋 Next Steps:")
    print("1. Test the API endpoints")
    print("2. Update your frontend to use the new API URL")
    print("3. Configure monitoring and alerting")
    print("")
    print("🔗 Test your API:")
    print("   curl https://your-api-gateway-url/health")
    print("   curl https://your-api-gateway-url/docs")

if __name__ == "__main__":
    main()
