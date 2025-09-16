#!/usr/bin/env python3
"""
Debug script to test Lambda function with environment variables
"""

import os
import json

def lambda_handler(event, context):
    """Simple debug Lambda handler"""
    
    # Get all environment variables
    env_vars = {k: v for k, v in os.environ.items() if not k.startswith('_')}
    
    # Test database URL
    database_url = os.getenv('DATABASE_URL', 'NOT_SET')
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'message': 'Debug Lambda function',
            'environment_variables': env_vars,
            'database_url': database_url,
            'event': event,
            'context': {
                'function_name': context.function_name if context else 'N/A',
                'aws_request_id': context.aws_request_id if context else 'N/A'
            }
        }, indent=2)
    }

if __name__ == "__main__":
    # Test locally
    test_event = {
        'version': '2.0',
        'routeKey': 'GET /debug',
        'rawPath': '/debug',
        'rawQueryString': '',
        'headers': {
            'accept': 'application/json'
        },
        'requestContext': {
            'requestId': 'test-request-id'
        },
        'isBase64Encoded': False
    }
    
    class MockContext:
        function_name = 'test-function'
        aws_request_id = 'test-request-id'
    
    result = lambda_handler(test_event, MockContext())
    print(json.dumps(result, indent=2))
