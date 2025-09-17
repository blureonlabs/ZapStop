import json
import os
import sys

def lambda_handler(event, context):
    """Test database connection with proper error handling"""
    try:
        import psycopg2
        
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        if path == '/db-test' or path == '/prod/db-test':
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
                
                # Test basic query
                cursor.execute("SELECT version(), current_database(), current_user, now()")
                result = cursor.fetchone()
                
                # Test table existence
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name
                """)
                tables = cursor.fetchall()
                
                cursor.close()
                conn.close()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'status': 'success',
                        'message': 'Database connection successful!',
                        'database_info': {
                            'version': result[0],
                            'database': result[1],
                            'user': result[2],
                            'timestamp': result[3].isoformat()
                        },
                        'tables': [table[0] for table in tables],
                        'lambda_request_id': context.aws_request_id
                    })
                }
            except Exception as db_error:
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'status': 'error',
                        'message': 'Database connection failed',
                        'error': str(db_error),
                        'error_type': type(db_error).__name__,
                        'lambda_request_id': context.aws_request_id
                    })
                }
        else:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'Database Test API',
                    'endpoints': ['/db-test'],
                    'status': 'running',
                    'psycopg2_available': True
                })
            }
            
    except ImportError as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Import error',
                'message': str(e),
                'type': type(e).__name__
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
