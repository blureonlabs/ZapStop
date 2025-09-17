import json
import os
import sys

def lambda_handler(event, context):
    """Simple Lambda handler for testing"""
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        # Simple routing
        if path == '/health':
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'ZapStop API is running on AWS!',
                    'database': 'RDS PostgreSQL available',
                    'endpoint': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/'
                })
            }
        else:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'message': 'Welcome to ZapStop API!',
                    'endpoints': ['/health'],
                    'status': 'running',
                    'api_url': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/'
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
