#!/usr/bin/env python3
"""
Test script to debug Lambda function issues
"""

import os
import sys
import json
import traceback

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test all imports to identify issues"""
    print("Testing imports...")
    
    try:
        print("1. Testing basic imports...")
        import logging
        print("✓ logging imported")
        
        print("2. Testing FastAPI import...")
        from fastapi import FastAPI
        print("✓ FastAPI imported")
        
        print("3. Testing Mangum import...")
        from mangum import Mangum
        print("✓ Mangum imported")
        
        print("4. Testing app config...")
        from app.config import settings
        print("✓ app.config imported")
        
        print("5. Testing database_aurora...")
        from app.database_aurora import engine, Base, init_database, check_database_connection
        print("✓ database_aurora imported")
        
        print("6. Testing main_lambda...")
        from app.main_lambda import app
        print("✓ main_lambda imported")
        
        print("7. Testing lambda_handler...")
        from lambda_handler import lambda_handler
        print("✓ lambda_handler imported")
        
        print("\nAll imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")
    
    try:
        from app.database_aurora import check_database_connection
        result = check_database_connection()
        print(f"Database connection: {'✓ Connected' if result else '❌ Failed'}")
        return result
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

def test_lambda_handler():
    """Test Lambda handler with a simple event"""
    print("\nTesting Lambda handler...")
    
    try:
        from lambda_handler import lambda_handler
        
        # Create a test event
        test_event = {
            'version': '2.0',
            'routeKey': 'GET /health',
            'rawPath': '/health',
            'rawQueryString': '',
            'headers': {
                'accept': 'application/json',
                'content-type': 'application/json',
                'host': 'localhost:3000',
                'user-agent': 'test-agent'
            },
            'requestContext': {
                'accountId': '123456789012',
                'apiId': 'test-api',
                'domainName': 'localhost',
                'http': {
                    'method': 'GET',
                    'path': '/health',
                    'protocol': 'HTTP/1.1',
                    'sourceIp': '127.0.0.1',
                    'userAgent': 'test-agent'
                },
                'requestId': 'test-request-id',
                'routeKey': 'GET /health',
                'stage': 'test',
                'time': '01/Jan/2024:00:00:00 +0000',
                'timeEpoch': 1704067200
            },
            'isBase64Encoded': False
        }
        
        class MockContext:
            aws_request_id = 'test-request-id'
            aws_request_time = '2024-01-01T00:00:00Z'
        
        print("Calling lambda_handler...")
        result = lambda_handler(test_event, MockContext())
        print(f"✓ Lambda handler executed successfully")
        print(f"Response: {json.dumps(result, indent=2)}")
        return True
        
    except Exception as e:
        print(f"❌ Lambda handler error: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    print("=== ZapStop Lambda Debug Test ===\n")
    
    # Test imports
    imports_ok = test_imports()
    
    if imports_ok:
        # Test database connection
        db_ok = test_database_connection()
        
        # Test Lambda handler
        handler_ok = test_lambda_handler()
        
        print(f"\n=== Test Results ===")
        print(f"Imports: {'✓ PASS' if imports_ok else '❌ FAIL'}")
        print(f"Database: {'✓ PASS' if db_ok else '❌ FAIL'}")
        print(f"Handler: {'✓ PASS' if handler_ok else '❌ FAIL'}")
    else:
        print("\n❌ Import tests failed - cannot proceed with other tests")
