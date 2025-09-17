import json
import os
import sys

def lambda_handler(event, context):
    """Simple test Lambda handler"""
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'message': 'ZapStop API is working!',
                'status': 'success',
                'path': path,
                'method': http_method,
                'timestamp': context.aws_request_id,
                'environment': 'AWS Lambda',
                'database_status': 'RDS PostgreSQL available (psycopg2 not installed in Lambda)'
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