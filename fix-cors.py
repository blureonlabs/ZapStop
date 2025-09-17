#!/usr/bin/env python3
import boto3
import json

# Initialize AWS clients
apigateway = boto3.client('apigateway', region_name='me-central-1')

def add_cors_to_endpoint(rest_api_id, resource_id, http_method):
    """Add CORS support to a specific endpoint"""
    try:
        # Add OPTIONS method
        apigateway.put_method(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            authorizationType='NONE'
        )
        
        # Add mock integration
        apigateway.put_integration(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            type='MOCK',
            requestTemplates={
                'application/json': '{"statusCode": 200}'
            }
        )
        
        # Add method response
        apigateway.put_method_response(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': False,
                'method.response.header.Access-Control-Allow-Methods': False,
                'method.response.header.Access-Control-Allow-Origin': False
            }
        )
        
        # Add integration response
        apigateway.put_integration_response(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                'method.response.header.Access-Control-Allow-Methods': "'GET,POST,PUT,DELETE,OPTIONS'",
                'method.response.header.Access-Control-Allow-Origin': "'*'"
            }
        )
        
        print(f"✅ Added CORS to {http_method} endpoint")
        return True
        
    except Exception as e:
        print(f"❌ Error adding CORS to {http_method}: {str(e)}")
        return False

def main():
    rest_api_id = 'pyk8cb9ull'
    
    # Get all resources
    response = apigateway.get_resources(restApiId=rest_api_id)
    
    # Find resources that have methods but no OPTIONS
    for resource in response['items']:
        resource_id = resource['id']
        path = resource['path']
        
        # Skip root resource
        if path == '/':
            continue
            
        # Check if resource has methods
        if 'resourceMethods' in resource:
            methods = list(resource['resourceMethods'].keys())
            
            # If it has methods but no OPTIONS, add CORS
            if 'OPTIONS' not in methods and methods:
                print(f"Adding CORS to {path} (methods: {methods})")
                add_cors_to_endpoint(rest_api_id, resource_id, 'OPTIONS')
    
    # Deploy the changes
    print("Deploying changes...")
    deployment = apigateway.create_deployment(
        restApiId=rest_api_id,
        stageName='prod'
    )
    print(f"✅ Deployment created: {deployment['id']}")

if __name__ == "__main__":
    main()
