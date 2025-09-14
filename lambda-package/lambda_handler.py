"""
AWS Lambda handler for ZapStop FastAPI application - Updated Version
Uses Mangum to convert FastAPI ASGI app to Lambda handler with Aurora optimization
"""

import os
import json
import logging
from mangum import Mangum
from app.main_lambda import app

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Mangum adapter with optimizations
handler = Mangum(
    app, 
    lifespan="off",  # Disable lifespan events for Lambda
    api_gateway_base_path=None,  # Handle all paths
    text_mime_types=[
        "application/json",
        "application/javascript",
        "application/xml",
        "application/vnd.api+json",
        "text/plain",
        "text/html",
        "text/css",
        "text/javascript",
    ]
)

def lambda_handler(event, context):
    """
    AWS Lambda handler function with Aurora optimization
    """
    try:
        # Log the incoming event (for debugging)
        logger.info(f"Lambda event: {json.dumps(event)}")
        
        # Add request context
        if 'requestContext' in event:
            # API Gateway v2 (HTTP API)
            request_id = event.get('requestContext', {}).get('requestId', 'unknown')
        else:
            # API Gateway v1 (REST API)
            request_id = event.get('requestContext', {}).get('requestId', 'unknown')
        
        # Set request ID in environment for logging
        os.environ['AWS_REQUEST_ID'] = request_id
        
        # Process the request
        response = handler(event, context)
        
        # Ensure response is properly formatted
        if isinstance(response, dict):
            # Add CORS headers if not present
            if 'headers' not in response:
                response['headers'] = {}
            
            headers = response['headers']
            
            # Add CORS headers
            headers.update({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
                'Access-Control-Allow-Credentials': 'true',
                'X-Request-ID': request_id,
                'X-Lambda-Runtime': 'python3.11'
            })
            
            # Ensure proper content type
            if 'body' in response and response['body']:
                if isinstance(response['body'], dict):
                    response['body'] = json.dumps(response['body'])
                    headers['Content-Type'] = 'application/json'
                elif not headers.get('Content-Type'):
                    headers['Content-Type'] = 'application/json'
            
            # Add status code if not present
            if 'statusCode' not in response:
                response['statusCode'] = 200
                
        else:
            # Convert non-dict response to proper format
            response = {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Allow-Credentials': 'true',
                    'Content-Type': 'application/json',
                    'X-Request-ID': request_id
                },
                'body': json.dumps(response) if not isinstance(response, str) else response
            }
        
        # Log successful response
        logger.info(f"Lambda response: {response.get('statusCode', 'unknown')} - {request_id}")
        
        return response
        
    except Exception as e:
        # Log the error
        logger.error(f"Lambda error: {str(e)}", exc_info=True)
        
        # Return error response
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
                'Content-Type': 'application/json',
                'X-Request-ID': context.aws_request_id if context else 'unknown'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': 'An unexpected error occurred',
                'request_id': context.aws_request_id if context else 'unknown',
                'timestamp': context.aws_request_time if context else 'unknown'
            })
        }

# For local testing
if __name__ == "__main__":
    # Test event for local development
    test_event = {
        'version': '2.0',
        'routeKey': 'GET /health',
        'rawPath': '/health',
        'rawQueryString': '',
        'headers': {
            'accept': 'application/json',
            'content-type': 'application/json',
            'host': 'localhost:3000',
            'user-agent': 'test-agent'
        },
        'requestContext': {
            'accountId': '123456789012',
            'apiId': 'test-api',
            'domainName': 'localhost',
            'http': {
                'method': 'GET',
                'path': '/health',
                'protocol': 'HTTP/1.1',
                'sourceIp': '127.0.0.1',
                'userAgent': 'test-agent'
            },
            'requestId': 'test-request-id',
            'routeKey': 'GET /health',
            'stage': 'test',
            'time': '01/Jan/2024:00:00:00 +0000',
            'timeEpoch': 1704067200
        },
        'isBase64Encoded': False
    }
    
    class MockContext:
        aws_request_id = 'test-request-id'
        aws_request_time = '2024-01-01T00:00:00Z'
    
    result = lambda_handler(test_event, MockContext())
    print(json.dumps(result, indent=2))
