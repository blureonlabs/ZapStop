import json
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables for AWS RDS
os.environ['DATABASE_URL'] = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'
os.environ['ENVIRONMENT'] = 'prod'
os.environ['ALLOWED_ORIGINS'] = '*'

def lambda_handler(event, context):
    """Simple Lambda handler for testing"""
    try:
        # Test database connection
        import psycopg2
        
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        # Simple routing
        if path == '/health':
            # Test database connection
            try:
                conn = psycopg2.connect(
                    host='zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com',
                    port=5432,
                    database='zapstop',
                    user='zapstop',
                    password='ZapStop2024!'
                )
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'status': 'healthy',
                        'database': 'connected',
                        'message': 'ZapStop API is running on AWS!'
                    })
                }
            except Exception as db_error:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'status': 'unhealthy',
                        'database': 'disconnected',
                        'error': str(db_error)
                    })
                }
        else:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Welcome to ZapStop API!',
                    'endpoints': ['/health'],
                    'status': 'running'
                })
            }
            
    except ImportError as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Import error',
                'message': str(e),
                'type': type(e).__name__
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e),
                'type': type(e).__name__
            })
        }
