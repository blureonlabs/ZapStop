import json
import os
import sys

def lambda_handler(event, context):
    """AWS Lambda handler for ZapStop API"""
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        # Simple routing
        if path == '/health' or path == '/prod/health':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'ZapStop API is running on AWS!',
                    'database': 'RDS PostgreSQL available',
                    'endpoint': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/',
                    'timestamp': context.aws_request_id
                })
            }
        elif path == '/':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                },
                'body': json.dumps({
                    'message': 'Welcome to ZapStop API!',
                    'version': '1.0.0',
                    'endpoints': ['/health', '/api/'],
                    'status': 'running',
                    'api_url': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/'
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
                    'available_endpoints': ['/health', '/']
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