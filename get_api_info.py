#!/usr/bin/env python3
"""
Get API information and available endpoints
"""

import requests
import json

def get_api_info():
    """Get API information and available endpoints"""
    
    api_url = "https://pyk8cb9ull.execute-api.me-central-1.amazonaws.com/prod"
    
    try:
        # Get root endpoint info
        print("🔍 Getting API information...")
        response = requests.get(api_url)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response:")
            print(json.dumps(data, indent=2))
            
            # Check if there are any database-related endpoints
            if 'endpoints' in data:
                print(f"\n📋 Available endpoints:")
                for endpoint in data['endpoints']:
                    print(f"  - {endpoint}")
                    
                    # Try to call database-related endpoints
                    if any(keyword in endpoint.lower() for keyword in ['db', 'database', 'table', 'schema']):
                        print(f"    🔍 Testing {endpoint}...")
                        try:
                            test_response = requests.get(f"{api_url}{endpoint}")
                            if test_response.status_code == 200:
                                test_data = test_response.json()
                                print(f"    ✅ Response: {json.dumps(test_data, indent=4)}")
                            else:
                                print(f"    ❌ Status: {test_response.status_code}")
                        except Exception as e:
                            print(f"    ❌ Error: {e}")
        else:
            print(f"❌ API returned status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    get_api_info()
