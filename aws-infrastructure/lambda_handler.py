"""
Simple working Lambda handler for ZapStop API
"""

import json

def lambda_handler(event, context):
    """Lambda handler function"""
    
    # Get the HTTP method and path
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    
    # Handle different routes
    if path == '/' or path == '':
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'message': 'ZapStop API is running!',
                'status': 'healthy',
                'version': '1.0.0'
            })
        }
    
    elif path == '/health':
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'status': 'healthy',
                'message': 'API is running',
                'timestamp': '2025-09-16T18:50:00Z'
            })
        }
    
    elif path == '/test':
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Test endpoint working',
                'timestamp': '2025-09-16T18:50:00Z'
            })
        }
    
    else:
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'Endpoint not found',
                'path': path
            })
        }