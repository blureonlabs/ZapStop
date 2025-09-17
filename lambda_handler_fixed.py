import json
import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from mangum import Mangum
    from app.main import app
    
    # Create the ASGI handler
    handler = Mangum(app, lifespan="off")
    
    def lambda_handler(event, context):
        """AWS Lambda handler for FastAPI app"""
        try:
            # Handle the request
            response = handler(event, context)
            return response
        except Exception as e:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Internal server error',
                    'message': str(e)
                })
            }
            
except ImportError as e:
    def lambda_handler(event, context):
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Import error',
                'message': str(e)
            })
        }
