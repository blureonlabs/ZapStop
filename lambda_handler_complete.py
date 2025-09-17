import json
import os
import sys
import time

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables for AWS RDS
os.environ['DATABASE_URL'] = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'
os.environ['ENVIRONMENT'] = 'prod'
os.environ['ALLOWED_ORIGINS'] = '*'

def lambda_handler(event, context):
    """AWS Lambda handler for complete FastAPI app with database connectivity"""
    try:
        from mangum import Mangum
        from app.main import app
        
        # Create the ASGI handler
        handler = Mangum(app, lifespan="off")
        
        # Handle the request
        response = handler(event, context)
        return response
        
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
                'type': type(e).__name__,
                'note': 'Make sure all dependencies are installed in the Lambda layer'
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