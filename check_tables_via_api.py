#!/usr/bin/env python3
"""
Check database tables through the deployed API endpoint
"""

import requests
import json

def check_tables_via_api():
    """Check what tables exist in the RDS database via API"""
    
    # API endpoint from the Lambda functions
    api_url = "https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod"
    
    try:
        # First, check if the API is healthy
        print("🔍 Checking API health...")
        health_response = requests.get(f"{api_url}/health")
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"✅ API is healthy: {health_data.get('status', 'unknown')}")
            print(f"📊 Database status: {health_data.get('database', 'unknown')}")
        else:
            print(f"❌ API health check failed: {health_response.status_code}")
            return
        
        # Try to get database info through different endpoints
        endpoints_to_try = [
            "/db-test",
            "/api/db-test", 
            "/tables",
            "/api/tables",
            "/database/tables",
            "/api/database/tables"
        ]
        
        for endpoint in endpoints_to_try:
            try:
                print(f"\n🔍 Trying endpoint: {endpoint}")
                response = requests.get(f"{api_url}{endpoint}")
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Success! Response from {endpoint}:")
                    print(json.dumps(data, indent=2))
                    
                    # Look for tables in the response
                    if 'tables' in data:
                        tables = data['tables']
                        print(f"\n📋 Found {len(tables)} tables:")
                        for table in tables:
                            print(f"  - {table}")
                    elif 'table_names' in data:
                        tables = data['table_names']
                        print(f"\n📋 Found {len(tables)} tables:")
                        for table in tables:
                            print(f"  - {table}")
                    break
                else:
                    print(f"❌ {endpoint} returned {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Error with {endpoint}: {e}")
        
        # If no specific table endpoint works, try to create a test endpoint
        print(f"\n🔍 Trying to create a test table endpoint...")
        test_payload = {
            "action": "list_tables",
            "query": "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
        }
        
        try:
            response = requests.post(f"{api_url}/api/query", json=test_payload)
            if response.status_code == 200:
                data = response.json()
                print("✅ Query endpoint works!")
                print(json.dumps(data, indent=2))
            else:
                print(f"❌ Query endpoint returned {response.status_code}")
        except Exception as e:
            print(f"❌ Query endpoint error: {e}")
            
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")

if __name__ == "__main__":
    check_tables_via_api()
