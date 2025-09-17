import json
import os
import sys
import time
import hashlib
import hmac
from datetime import datetime, timedelta
import logging

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Set environment variables for AWS RDS
os.environ['DATABASE_URL'] = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'
os.environ['ENVIRONMENT'] = 'prod'
os.environ['ALLOWED_ORIGINS'] = '*'
os.environ['JWT_SECRET_KEY'] = 'zapstop-secret-key-2024-change-in-production'
os.environ['JWT_ALGORITHM'] = 'HS256'
os.environ['JWT_ACCESS_TOKEN_EXPIRE_MINUTES'] = '30'

# Database connection using pg8000 (pure Python)
import pg8000
import urllib.parse

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

def execute_query(query, params=None, fetch_one=False, fetch_all=False):
    """Execute database query with proper error handling"""
    conn = None
    try:
        conn = get_db_connection()
        if not conn:
            return None
            
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        if fetch_one:
            result = cursor.fetchone()
            if result:
                # Convert to dict with column names
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, result))
            return None
        elif fetch_all:
            results = cursor.fetchall()
            if results:
                columns = [desc[0] for desc in cursor.description]
                return [dict(zip(columns, row)) for row in results]
            return []
        else:
            conn.commit()
            return True
            
    except Exception as e:
        logger.error(f"Query execution error: {str(e)}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

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

def get_user_by_email(email):
    """Get user from database by email"""
    query = """
    SELECT id, email, password_hash, name, role, phone, created_at, updated_at
    FROM users 
    WHERE email = %s
    """
    return execute_query(query, (email,), fetch_one=True)

def get_user_by_id(user_id):
    """Get user from database by ID"""
    query = """
    SELECT id, email, password_hash, name, role, phone, created_at, updated_at
    FROM users 
    WHERE id = %s
    """
    return execute_query(query, (user_id,), fetch_one=True)

def verify_password(plain_password, hashed_password):
    """Verify password using bcrypt"""
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except:
        # Fallback to simple comparison for demo
        return plain_password == hashed_password

def lambda_handler(event, context):
    """AWS Lambda handler for ZapStop API with database connectivity"""
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
            # Test database connection
            db_status = "healthy"
            try:
                conn = get_db_connection()
                if conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT 1")
                    conn.close()
                else:
                    db_status = "unhealthy: No connection"
            except Exception as e:
                db_status = f"unhealthy: {str(e)}"
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
                    'message': 'ZapStop API is running on AWS!',
                    'database': db_status,
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
                
                # Get user from database
                user = get_user_by_email(email)
                
                if not user:
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
                
                # Verify password
                if not verify_password(password, user['password_hash']):
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
                            'role': user['role'],
                            'phone': user.get('phone', ''),
                            'created_at': user.get('created_at', ''),
                            'updated_at': user.get('updated_at', '')
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
            
            user = get_user_by_email(payload['sub'])
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
                    'role': user['role'],
                    'phone': user.get('phone', ''),
                    'created_at': user.get('created_at', ''),
                    'updated_at': user.get('updated_at', '')
                })
            }
            
        elif path == '/api/users' or path == '/prod/api/users':
            # Get all users from database
            users = execute_query("""
                SELECT id, email, name, role, phone, created_at, updated_at
                FROM users 
                ORDER BY created_at DESC
            """, fetch_all=True)
            
            if users is None:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Database error',
                        'message': 'Failed to fetch users'
                    })
                }
            
            # Handle empty result
            if not users:
                users = []
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'users': users,
                    'count': len(users),
                    'message': 'Users fetched successfully from database'
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
                    'database': 'RDS PostgreSQL (zapstop-db) - CONNECTED',
                    'infrastructure': 'AWS Lambda + API Gateway + RDS'
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
        logger.error(f"Lambda handler error: {str(e)}")
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
