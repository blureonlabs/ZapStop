#!/usr/bin/env python3
"""
Setup database schema and create admin user
"""

import json
import os
import sys
import time
import hashlib
import hmac
from datetime import datetime, timedelta
import logging
import urllib.parse
import pg8000
import uuid

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Set environment variables for AWS RDS
os.environ['DATABASE_URL'] = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'

def get_db_connection():
    """Get database connection with proper error handling"""
    try:
        # Parse the database URL
        url = os.environ['DATABASE_URL']
        parsed = urllib.parse.urlparse(url)
        
        conn = pg8000.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],  # Remove leading slash
            user=parsed.username,
            password=parsed.password,
            ssl_context=True
        )
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return None

def hash_password(password):
    """Hash password using bcrypt"""
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    except:
        # Fallback to simple hash for demo
        return hashlib.sha256(password.encode()).hexdigest()

def setup_database():
    """Setup database schema and create admin user"""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                phone VARCHAR(20),
                assigned_car_id UUID,
                documents JSONB,
                document_expiry_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create index on email
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        """)
        
        # Create index on role
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
        """)
        
        conn.commit()
        logger.info("Database schema created successfully")
        
        # Check if admin user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", ("blureonlabs@gmail.com",))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return {
                "message": "Database setup complete. Admin user already exists",
                "user": {
                    "email": "blureonlabs@gmail.com",
                    "role": "admin"
                }
            }
        
        # Create admin user
        user_id = str(uuid.uuid4())
        password_hash = hash_password("admin123")  # Default password
        
        cursor.execute("""
            INSERT INTO users (id, email, password_hash, name, role, phone, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "blureonlabs@gmail.com",
            password_hash,
            "Blureon Labs Admin",
            "admin",
            "+1234567890",
            datetime.utcnow(),
            datetime.utcnow()
        ))
        
        conn.commit()
        
        return {
            "message": "Database setup complete. Admin user created successfully",
            "user": {
                "id": user_id,
                "email": "blureonlabs@gmail.com",
                "name": "Blureon Labs Admin",
                "role": "admin",
                "phone": "+1234567890"
            }
        }
        
    except Exception as e:
        logger.error(f"Error setting up database: {str(e)}")
        if conn:
            conn.rollback()
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

def lambda_handler(event, context):
    """AWS Lambda handler to setup database and create admin user"""
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                },
                'body': ''
            }
        
        # Setup database and create admin user
        result = setup_database()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
        
    except Exception as e:
        logger.error(f"Lambda handler error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

if __name__ == "__main__":
    # Test locally
    result = setup_database()
    print(json.dumps(result, indent=2))
