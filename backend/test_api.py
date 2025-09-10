#!/usr/bin/env python3
"""
ZapStop API Test Script
Test the API endpoints using requests
"""

import requests
import json
from typing import Dict, Any

# API Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api"

class ZapStopAPIClient:
    def __init__(self, base_url: str = API_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login and get access token"""
        url = f"{self.base_url}/auth/login"
        data = {
            "username": email,
            "password": password
        }
        
        response = self.session.post(url, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        self.access_token = token_data["access_token"]
        
        # Set authorization header for future requests
        self.session.headers.update({
            "Authorization": f"Bearer {self.access_token}"
        })
        
        return token_data
    
    def get_current_user(self) -> Dict[str, Any]:
        """Get current user information"""
        url = f"{self.base_url}/auth/me"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()
    
    def get_dashboard_data(self, time_filter: str = "monthly") -> Dict[str, Any]:
        """Get dashboard analytics"""
        url = f"{self.base_url}/analytics/dashboard"
        params = {"time_filter": time_filter}
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_users(self) -> Dict[str, Any]:
        """Get all users"""
        url = f"{self.base_url}/users"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        url = f"{self.base_url}/users"
        response = self.session.post(url, json=user_data)
        response.raise_for_status()
        return response.json()
    
    def get_cars(self) -> Dict[str, Any]:
        """Get all cars"""
        url = f"{self.base_url}/cars"
        response = self.session.get(url)
        response.raise_for_status()
        return response.json()
    
    def create_car(self, car_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new car"""
        url = f"{self.base_url}/cars"
        response = self.session.post(url, json=car_data)
        response.raise_for_status()
        return response.json()
    
    def get_earnings(self, driver_id: str = None) -> Dict[str, Any]:
        """Get earnings"""
        url = f"{self.base_url}/earnings"
        params = {"driver_id": driver_id} if driver_id else {}
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def create_earning(self, earning_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create earnings record"""
        url = f"{self.base_url}/earnings"
        response = self.session.post(url, json=earning_data)
        response.raise_for_status()
        return response.json()

def test_api():
    """Test the ZapStop API"""
    print("🚀 Testing ZapStop API...")
    
    # Initialize client
    client = ZapStopAPIClient()
    
    try:
        # Test 1: Health Check
        print("\n1. Testing Health Check...")
        response = requests.get(f"{BASE_URL}/health")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        # Test 2: Login (you'll need to create a user first)
        print("\n2. Testing Login...")
        try:
            login_data = client.login("admin@zapstop.com", "admin123")
            print(f"   Login successful!")
            print(f"   Access Token: {login_data['access_token'][:50]}...")
        except requests.exceptions.HTTPError as e:
            print(f"   Login failed: {e}")
            print("   Note: You need to create an admin user first")
            return
        
        # Test 3: Get Current User
        print("\n3. Testing Get Current User...")
        user_info = client.get_current_user()
        print(f"   User: {user_info['name']} ({user_info['role']})")
        print(f"   Email: {user_info['email']}")
        
        # Test 4: Get Dashboard Data
        print("\n4. Testing Dashboard Analytics...")
        dashboard_data = client.get_dashboard_data()
        print(f"   Total Earnings: AED {dashboard_data.get('total_earnings', 0):,.2f}")
        print(f"   Total Expenses: AED {dashboard_data.get('total_expenses', 0):,.2f}")
        print(f"   Net Profit: AED {dashboard_data.get('net_profit', 0):,.2f}")
        
        # Test 5: Get Users
        print("\n5. Testing Get Users...")
        users = client.get_users()
        print(f"   Found {len(users)} users")
        for user in users[:3]:  # Show first 3 users
            print(f"   - {user['name']} ({user['role']})")
        
        # Test 6: Get Cars
        print("\n6. Testing Get Cars...")
        cars = client.get_cars()
        print(f"   Found {len(cars)} cars")
        for car in cars[:3]:  # Show first 3 cars
            print(f"   - {car['plate_number']} ({car['model']})")
        
        # Test 7: Get Earnings
        print("\n7. Testing Get Earnings...")
        earnings = client.get_earnings()
        print(f"   Found {len(earnings)} earnings records")
        
        print("\n✅ API tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ API test failed: {e}")
        print("Make sure the backend is running on http://localhost:8000")

if __name__ == "__main__":
    test_api()
