#!/usr/bin/env python3
import boto3
import json

def add_route(apigateway, rest_api_id, parent_id, path_part, methods=['GET'], lambda_arn=None):
    """Add a new route with CORS support"""
    try:
        # Create resource
        resource = apigateway.create_resource(
            restApiId=rest_api_id,
            parentId=parent_id,
            pathPart=path_part
        )
        resource_id = resource['id']
        print(f"✅ Created resource: /{path_part}")
        
        # Add methods
        for method in methods:
            # Add HTTP method
            apigateway.put_method(
                restApiId=rest_api_id,
                resourceId=resource_id,
                httpMethod=method,
                authorizationType='NONE'
            )
            print(f"✅ Added {method} method to /{path_part}")
            
            # Add integration
            if lambda_arn:
                apigateway.put_integration(
                    restApiId=rest_api_id,
                    resourceId=resource_id,
                    httpMethod=method,
                    type='AWS_PROXY',
                    integrationHttpMethod='POST',
                    uri=lambda_arn
                )
                print(f"✅ Added Lambda integration for {method} /{path_part}")
            else:
                # Mock integration for OPTIONS
                apigateway.put_integration(
                    restApiId=rest_api_id,
                    resourceId=resource_id,
                    httpMethod=method,
                    type='MOCK',
                    requestTemplates={"application/json": "{\"statusCode\": 200}"}
                )
                print(f"✅ Added MOCK integration for {method} /{path_part}")
        
        # Add OPTIONS method for CORS
        apigateway.put_method(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            authorizationType='NONE'
        )
        
        apigateway.put_integration(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            type='MOCK',
            requestTemplates={"application/json": "{\"statusCode\": 200}"}
        )
        
        # Add OPTIONS method response
        apigateway.put_method_response(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': True,
                'method.response.header.Access-Control-Allow-Methods': True,
                'method.response.header.Access-Control-Allow-Origin': True
            }
        )
        
        # Add OPTIONS integration response
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
        
        print(f"✅ Added CORS support for /{path_part}")
        return resource_id
        
    except Exception as e:
        print(f"❌ Error adding route /{path_part}: {e}")
        return None

def main():
    region = 'me-central-1'
    rest_api_id = 'pyk8cb9ull'
    lambda_arn = 'arn:aws:apigateway:me-central-1:lambda:path/2015-03-31/functions/arn:aws:lambda:me-central-1:617291204846:function:zapstop-test-db/invocations'
    
    apigateway = boto3.client('apigateway', region_name=region)
    
    # Get the /api resource ID
    resources = apigateway.get_resources(restApiId=rest_api_id)['items']
    api_resource_id = None
    for resource in resources:
        if resource['path'] == '/api':
            api_resource_id = resource['id']
            break
    
    if not api_resource_id:
        print("❌ Could not find /api resource")
        return
    
    print(f"📡 Found /api resource ID: {api_resource_id}")
    
    # Add leave-requests route
    add_route(apigateway, rest_api_id, api_resource_id, 'leave-requests', ['GET', 'POST'], lambda_arn)
    
    # Deploy the API
    print("\n🚀 Deploying API...")
    try:
        deployment = apigateway.create_deployment(
            restApiId=rest_api_id,
            stageName='prod'
        )
        print(f"✅ API deployed successfully: {deployment['id']}")
    except Exception as e:
        print(f"❌ Error deploying API: {e}")

if __name__ == "__main__":
    main()
