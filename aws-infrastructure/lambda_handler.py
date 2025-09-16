"""
Lambda handler for ZapStop FastAPI application
"""

import os
import sys
import json

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def lambda_handler(event, context):
    """Lambda handler function"""
    try:
        # Get the HTTP method and path
        http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
        path = event.get('path', event.get('rawPath', '/'))
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                },
                'body': ''
            }
        
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
                    'version': '1.0.0',
                    'environment': os.getenv('STAGE', 'dev')
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
                    'timestamp': '2025-01-16T18:50:00Z'
                })
            }
        
        elif path.startswith('/api/auth/login'):
            if http_method == 'POST':
                # Parse form data from body
                body = event.get('body', '')
                if event.get('isBase64Encoded', False):
                    import base64
                    body = base64.b64decode(body).decode('utf-8')
                
                # Simple login response for now
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'access_token': 'mock-token-for-testing',
                        'token_type': 'bearer',
                        'message': 'Login endpoint working - needs database connection'
                    })
                }
            else:
                return {
                    'statusCode': 405,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Method not allowed',
                        'message': 'Only POST method allowed for login'
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
                    'path': path,
                    'method': http_method
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'details': str(e)
            })
        }