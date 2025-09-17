#!/usr/bin/env python3
"""
Local Performance Test for ZapStop Backend
Tests the optimized analytics service performance
"""

import requests
import time
import json

def test_backend_performance():
    """Test backend performance locally"""
    
    base_url = "http://localhost:8000"
    
    print("🚀 Testing ZapStop Backend Performance...")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing Health Check...")
    start_time = time.time()
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        health_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check: {health_time:.2f}ms")
            print(f"   Database: {data.get('database', 'unknown')}")
            print(f"   Response time: {data.get('response_time_ms', 0):.2f}ms")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    # Test 2: API Root
    print("\n2. Testing API Root...")
    start_time = time.time()
    try:
        response = requests.get(f"{base_url}/", timeout=10)
        root_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API root: {root_time:.2f}ms")
            print(f"   Message: {data.get('message', 'unknown')}")
        else:
            print(f"❌ API root failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API root error: {e}")
    
    # Test 3: API Documentation
    print("\n3. Testing API Documentation...")
    start_time = time.time()
    try:
        response = requests.get(f"{base_url}/docs", timeout=10)
        docs_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            print(f"✅ API docs: {docs_time:.2f}ms")
        else:
            print(f"❌ API docs failed: {response.status_code}")
    except Exception as e:
        print(f"❌ API docs error: {e}")
    
    # Test 4: Multiple requests to test consistency
    print("\n4. Testing Multiple Requests (Performance Consistency)...")
    times = []
    for i in range(5):
        start_time = time.time()
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            request_time = (time.time() - start_time) * 1000
            times.append(request_time)
            print(f"   Request {i+1}: {request_time:.2f}ms")
        except Exception as e:
            print(f"   Request {i+1}: Error - {e}")
    
    if times:
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        print(f"\n📊 Performance Summary:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")
        
        # Performance assessment
        if avg_time < 100:
            print("✅ EXCELLENT: Average response time under 100ms")
        elif avg_time < 500:
            print("✅ GOOD: Average response time under 500ms")
        elif avg_time < 1000:
            print("⚠️  FAIR: Average response time under 1 second")
        else:
            print("❌ SLOW: Average response time over 1 second")
    
    print("\n" + "=" * 50)
    print("🎉 Performance test completed!")
    print("\n💡 Next steps:")
    print("1. Apply database optimizations to your Neon database")
    print("2. Test the analytics endpoints with authentication")
    print("3. Compare performance with your production environment")

if __name__ == "__main__":
    test_backend_performance()
