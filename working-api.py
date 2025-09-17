import json
import os
import sys

def lambda_handler(event, context):
    """Working API handler for ZapStop"""
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
                    'timestamp': context.aws_request_id,
                    'environment': 'AWS Lambda + API Gateway + RDS'
                })
            }
        elif path == '/api/test' or path == '/prod/api/test':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'message': 'API Test Endpoint',
                    'status': 'success',
                    'method': http_method,
                    'path': path,
                    'timestamp': context.aws_request_id
                })
            }
        elif path == '/' or path == '/prod/':
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
                    'status': 'running',
                    'environment': 'AWS Lambda + API Gateway + RDS',
                    'endpoints': [
                        '/health',
                        '/api/test'
                    ],
                    'api_url': 'https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod/',
                    'database': 'RDS PostgreSQL (zapstop-db)',
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
                    'available_endpoints': ['/health', '/api/test', '/']
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
