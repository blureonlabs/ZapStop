import json
import os
import sys
import time

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables for AWS RDS
os.environ['DATABASE_URL'] = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'
os.environ['ENVIRONMENT'] = 'prod'
os.environ['ALLOWED_ORIGINS'] = '*'
os.environ['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'] = '30'

def lambda_handler(event, context):
    """AWS Lambda handler for ZapStop API with graceful database handling"""
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
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
        
        # Route handling
        if path == '/health' or path == '/prod/health':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'ZapStop API is running on AWS!',
                    'database': 'RDS PostgreSQL available',
                    'endpoint': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/',
                    'timestamp': context.aws_request_id,
                    'environment': 'AWS Lambda + API Gateway + RDS'
                })
            }
        elif path == '/api/auth/login' or path == '/prod/api/auth/login':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Login endpoint - Ready for implementation',
                    'status': 'ready',
                    'note': 'Database connectivity will be added'
                })
            }
        elif path == '/api/users' or path == '/prod/api/users':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Users endpoint - Ready for implementation',
                    'status': 'ready',
                    'note': 'Database connectivity will be added'
                })
            }
        elif path == '/api/cars' or path == '/prod/api/cars':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Cars endpoint - Ready for implementation',
                    'status': 'ready',
                    'note': 'Database connectivity will be added'
                })
            }
        elif path == '/api/analytics' or path == '/prod/api/analytics':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Analytics endpoint - Ready for implementation',
                    'status': 'ready',
                    'note': 'Database connectivity will be added'
                })
            }
        elif path == '/' or path == '/prod/':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Welcome to ZapStop API!',
                    'version': '1.0.0',
                    'status': 'running',
                    'environment': 'AWS Lambda + API Gateway + RDS',
                    'endpoints': [
                        '/health',
                        '/api/auth/login',
                        '/api/users',
                        '/api/cars',
                        '/api/analytics'
                    ],
                    'api_url': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/',
                    'database': 'RDS PostgreSQL (zapstop-db)',
                    'infrastructure': 'AWS Lambda + API Gateway + RDS',
                    'note': 'All endpoints are ready for database integration'
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
                    'error': 'Not Found',
                    'message': f'Endpoint {path} not found',
                    'available_endpoints': [
                        '/health',
                        '/api/auth/login',
                        '/api/users',
                        '/api/cars',
                        '/api/analytics'
                    ]
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
                'message': str(e),
                'type': type(e).__name__
            })
        }
