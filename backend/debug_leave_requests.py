#!/usr/bin/env python3
"""
Debug Leave Requests API
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def test_login():
    """Test login and return token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": "admin@zapstop.com", "password": "admin123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Login successful")
        return token
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_leave_requests():
    """Test leave requests API with detailed error info"""
    token = test_login()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔍 Testing Leave Requests API...")
    
    # Test GET
    print("\n1. Testing GET /api/leave-requests/")
    response = requests.get(f"{BASE_URL}/api/leave-requests/?skip=0&limit=1", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Test POST
    print("\n2. Testing POST /api/leave-requests/")
    # Get a driver ID first
    users_response = requests.get(f"{BASE_URL}/api/users/", headers=headers)
    if users_response.status_code == 200:
        users = users_response.json()
        driver_id = None
        for user in users:
            if user.get('role') == 'driver':
                driver_id = user['id']
                break
        
        if driver_id:
            leave_request_data = {
                "driver_id": driver_id,
                "leave_type": "sick",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "reason": "Test leave request",
                "status": "pending"
            }
            response = requests.post(f"{BASE_URL}/api/leave-requests/", headers=headers, json=leave_request_data)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        else:
            print("❌ No driver found for testing")

if __name__ == "__main__":
    test_leave_requests()
