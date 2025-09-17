import json
import os
import sys

def lambda_handler(event, context):
    """Test RDS database connection from Lambda"""
    try:
        # Test database connection
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
                cursor.execute("SELECT version(), current_database(), current_user")
                result = cursor.fetchone()
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
                            'user': result[2]
                        },
                        'timestamp': context.aws_request_id
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
                        'error_type': type(db_error).__name__
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
                    'status': 'running'
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
