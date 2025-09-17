#!/usr/bin/env python3
import boto3
import json

def add_method_and_integration(client, rest_api_id, resource_id, method, lambda_uri):
    """Add HTTP method and Lambda integration to API Gateway resource"""
    try:
        # Add the method
        client.put_method(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod=method,
            authorizationType='NONE'
        )
        print(f"Added {method} method to resource {resource_id}")
        
        # Add Lambda integration
        client.put_integration(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod=method,
            type='AWS_PROXY',
            integrationHttpMethod='POST',
            uri=lambda_uri
        )
        print(f"Added Lambda integration for {method} method")
        
        return True
    except Exception as e:
        print(f"Error adding {method} method: {e}")
        return False

def add_cors_to_resource(client, rest_api_id, resource_id, methods):
    """Add CORS configuration to API Gateway resource"""
    try:
        # Add OPTIONS method for CORS
        client.put_method(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            authorizationType='NONE'
        )
        
        # Add CORS integration
        client.put_integration(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            type='MOCK',
            integrationResponses={
                '200': {
                    'statusCode': '200',
                    'responseParameters': {
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Methods': f"'{methods}'"
                    }
                }
            },
            requestTemplates={
                'application/json': '{"statusCode": 200}'
            }
        )
        
        # Add CORS method response
        client.put_method_response(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': True,
                'method.response.header.Access-Control-Allow-Origin': True,
                'method.response.header.Access-Control-Allow-Methods': True
            }
        )
        
        # Add CORS integration response
        client.put_integration_response(
            restApiId=rest_api_id,
            resourceId=resource_id,
            httpMethod='OPTIONS',
            statusCode='200',
            responseParameters={
                'method.response.header.Access-Control-Allow-Headers': 'method.request.header.Access-Control-Allow-Headers',
                'method.response.header.Access-Control-Allow-Origin': 'method.request.header.Access-Control-Allow-Origin',
                'method.response.header.Access-Control-Allow-Methods': 'method.request.header.Access-Control-Allow-Methods'
            }
        )
        
        print(f"Added CORS configuration for resource {resource_id}")
        return True
    except Exception as e:
        print(f"Error adding CORS: {e}")
        return False

def main():
    # AWS configuration
    region = 'me-central-1'
    rest_api_id = 'pyk8cb9ull'
    lambda_function_name = 'zapstop-backend'
    
    # Create API Gateway client
    client = boto3.client('apigateway', region_name=region)
    
    # Get Lambda function ARN
    lambda_client = boto3.client('lambda', region_name=region)
    lambda_response = lambda_client.get_function(FunctionName=lambda_function_name)
    lambda_arn = lambda_response['Configuration']['FunctionArn']
    lambda_uri = f"arn:aws:apigateway:{region}:lambda:path/2015-03-31/functions/{lambda_arn}/invocations"
    
    print(f"Lambda URI: {lambda_uri}")
    
    # Get the cars resource ID
    resources = client.get_resources(restApiId=rest_api_id)
    cars_resource_id = None
    
    for resource in resources['items']:
        if resource['path'] == '/api/cars':
            cars_resource_id = resource['id']
            break
    
    if not cars_resource_id:
        print("Cars resource not found!")
        return
    
    print(f"Found cars resource: {cars_resource_id}")
    
    # Add POST method to cars
    success = add_method_and_integration(client, rest_api_id, cars_resource_id, 'POST', lambda_uri)
    if success:
        print("Successfully added POST method to cars resource")
        
        # Add CORS for GET,POST
        add_cors_to_resource(client, rest_api_id, cars_resource_id, 'GET,POST')
        
        # Deploy the API
        try:
            client.create_deployment(
                restApiId=rest_api_id,
                stageName='prod',
                description='Added POST method to cars'
            )
            print("API deployed successfully!")
        except Exception as e:
            print(f"Error deploying API: {e}")
    else:
        print("Failed to add POST method to cars resource")

if __name__ == "__main__":
    main()
