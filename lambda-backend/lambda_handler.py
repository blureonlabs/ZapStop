
import json
import os
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
