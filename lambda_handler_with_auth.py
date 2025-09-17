import json
import os
import sys
import time
import hashlib
import hmac
from datetime import datetime, timedelta

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables for AWS RDS
os.environ['DATABASE_URL'] = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'
os.environ['ENVIRONMENT'] = 'prod'
os.environ['ALLOWED_ORIGINS'] = '*'
os.environ['JWT_SECRET_KEY'] = 'zapstop-secret-key-2024-change-in-production'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'] = '30'

# Simple JWT implementation (without external dependencies)
def create_jwt_token(payload, secret, expires_minutes=30):
    """Simple JWT token creation"""
    import base64
    import json
    
    # Header
    header = {"alg": "HS256", "typ": "JWT"}
    header_encoded = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    
    # Payload with expiration
    payload['exp'] = int(time.time()) + (expires_minutes * 60)
    payload_encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    
    # Signature
    message = f"{header_encoded}.{payload_encoded}"
    signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
    signature_encoded = base64.urlsafe_b64encode(signature).decode().rstrip('=')
    
    return f"{header_encoded}.{payload_encoded}.{signature_encoded}"

def verify_jwt_token(token, secret):
    """Simple JWT token verification"""
    try:
        import base64
        import json
        
        parts = token.split('.')
        if len(parts) != 3:
            return None
            
        header_encoded, payload_encoded, signature_encoded = parts
        
        # Verify signature
        message = f"{header_encoded}.{payload_encoded}"
        expected_signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()
        expected_signature_encoded = base64.urlsafe_b64encode(expected_signature).decode().rstrip('=')
        
        if not hmac.compare_digest(signature_encoded, expected_signature_encoded):
            return None
            
        # Decode payload
        payload_padded = payload_encoded + '=' * (4 - len(payload_encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded))
        
        # Check expiration
        if payload.get('exp', 0) < int(time.time()):
            return None
            
        return payload
    except:
        return None

# Simple user database (in production, this would be in RDS)
DEMO_USERS = {
    "admin@zapstop.com": {
        "id": "1",
        "email": "admin@zapstop.com",
        "password": "admin123",  # In production, this would be hashed
        "name": "Admin User",
        "role": "admin"
    },
    "driver@zapstop.com": {
        "id": "2", 
        "email": "driver@zapstop.com",
        "password": "driver123",
        "name": "Driver User",
        "role": "driver"
    },
    "accountant@zapstop.com": {
        "id": "3",
        "email": "accountant@zapstop.com", 
        "password": "accountant123",
        "name": "Accountant User",
        "role": "accountant"
    }
}

def lambda_handler(event, context):
    """AWS Lambda handler for ZapStop API with working authentication"""
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        body = event.get('body', '{}')
        
        # Handle CORS preflight
        if http_method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
                    'Access-Control-Max-Age': '86400'
                },
                'body': ''
            }
        
        # Parse JSON body for POST requests
        if body and http_method in ['POST', 'PUT', 'PATCH']:
            try:
                body_data = json.loads(body) if isinstance(body, str) else body
            except:
                body_data = {}
        else:
            body_data = {}
        
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
            if http_method == 'POST':
                email = body_data.get('username') or body_data.get('email')
                password = body_data.get('password')
                
                if not email or not password:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'error': 'Missing credentials',
                            'message': 'Email and password are required'
                        })
                    }
                
                # Normalize email (lowercase, trim spaces)
                email = email.strip().lower()
                password = password.strip()
                
                # Check user credentials
                user = DEMO_USERS.get(email)
                if not user or user['password'] != password:
                    return {
                        'statusCode': 401,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({
                            'error': 'Invalid credentials',
                            'message': 'Incorrect email or password'
                        })
                    }
                
                # Create tokens
                access_token = create_jwt_token(
                    {'sub': user['email'], 'user_id': user['id'], 'role': user['role']},
                    os.environ['JWT_SECRET_KEY'],
                    30  # 30 minutes
                )
                
                refresh_token = create_jwt_token(
                    {'sub': user['email'], 'user_id': user['id'], 'role': user['role']},
                    os.environ['JWT_SECRET_KEY'] + '_refresh',
                    7 * 24 * 60  # 7 days
                )
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'access_token': access_token,
                        'refresh_token': refresh_token,
                        'token_type': 'bearer',
                        'user': {
                            'id': user['id'],
                            'email': user['email'],
                            'name': user['name'],
                            'role': user['role']
                        }
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
                        'message': 'Only POST method is allowed for login'
                    })
                }
        elif path == '/api/auth/me' or path == '/prod/api/auth/me':
            # Get authorization header
            headers = event.get('headers', {})
            auth_header = headers.get('Authorization') or headers.get('authorization', '')
            
            if not auth_header.startswith('Bearer '):
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Missing token',
                        'message': 'Authorization header with Bearer token is required'
                    })
                }
            
            token = auth_header.split(' ')[1]
            payload = verify_jwt_token(token, os.environ['JWT_SECRET_KEY'])
            
            if not payload:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Invalid token',
                        'message': 'Token is invalid or expired'
                    })
                }
            
            user = DEMO_USERS.get(payload['sub'])
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'User not found',
                        'message': 'User associated with token not found'
                    })
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'id': user['id'],
                    'email': user['email'],
                    'name': user['name'],
                    'role': user['role']
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
                    'note': 'Database connectivity will be added',
                    'demo_users': list(DEMO_USERS.keys())
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
                        '/api/auth/me',
                        '/api/users'
                    ],
                    'api_url': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/',
                    'database': 'RDS PostgreSQL (zapstop-db)',
                    'infrastructure': 'AWS Lambda + API Gateway + RDS',
                    'demo_credentials': {
                        'admin': 'admin@zapstop.com / admin123',
                        'driver': 'driver@zapstop.com / driver123',
                        'accountant': 'accountant@zapstop.com / accountant123'
                    }
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
                        '/api/auth/me',
                        '/api/users'
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
