#!/usr/bin/env python3
"""
Create admin user in the database
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

def create_admin_user():
    """Create admin user in the database"""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return {"error": "Database connection failed"}
        
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", ("blureonlabs@gmail.com",))
        existing_user = cursor.fetchone()
        
        if existing_user:
            return {"message": "User already exists", "email": "blureonlabs@gmail.com"}
        
        # Create new admin user
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
            "message": "Admin user created successfully",
            "user": {
                "id": user_id,
                "email": "blureonlabs@gmail.com",
                "name": "Blureon Labs Admin",
                "role": "admin",
                "phone": "+1234567890"
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating admin user: {str(e)}")
        if conn:
            conn.rollback()
        return {"error": str(e)}
    finally:
        if conn:
            conn.close()

def lambda_handler(event, context):
    """AWS Lambda handler to create admin user"""
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
        
        # Create admin user
        result = create_admin_user()
        
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
    result = create_admin_user()
    print(json.dumps(result, indent=2))
