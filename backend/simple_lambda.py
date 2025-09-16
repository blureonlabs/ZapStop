#!/usr/bin/env python3
"""
Simple Lambda function for debugging
"""

import os
import json

def lambda_handler(event, context):
    """Simple Lambda handler for debugging"""
    
    # Get the path from the event
    path = event.get('rawPath', '/')
    
    # Get environment variables
    database_url = os.getenv('DATABASE_URL', 'NOT_SET')
    stage = os.getenv('STAGE', 'NOT_SET')
    
    # Test database connection
    db_status = "unknown"
    try:
        import psycopg2
        conn = psycopg2.connect(database_url)
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"failed: {str(e)}"
    
    response_body = {
        "message": "Simple Lambda Debug",
        "path": path,
        "environment": {
            "STAGE": stage,
            "DATABASE_URL": database_url[:50] + "..." if len(database_url) > 50 else database_url,
            "database_status": db_status
        },
        "event": {
            "rawPath": event.get('rawPath'),
            "routeKey": event.get('routeKey'),
            "httpMethod": event.get('http', {}).get('method') if 'http' in event else 'N/A'
        }
    }
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps(response_body, indent=2)
    }

if __name__ == "__main__":
    # Test locally
    test_event = {
        'version': '2.0',
        'routeKey': 'GET /test',
        'rawPath': '/test',
        'rawQueryString': '',
        'headers': {
            'accept': 'application/json'
        },
        'requestContext': {
            'requestId': 'test-request-id'
        },
        'isBase64Encoded': False
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
