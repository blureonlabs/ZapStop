#!/usr/bin/env python3
"""
Test AWS RDS PostgreSQL Database Connection
"""

import psycopg2
import time
import sys
from datetime import datetime

# AWS RDS Database Configuration
DB_CONFIG = {
    'host': 'zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com',
    'port': 5432,
    'database': 'zapstop',
    'user': 'zapstop',
    'password': 'ZapStop2024!'
}

def test_connection():
    """Test database connection and basic operations"""
    print("🔍 Testing AWS RDS PostgreSQL Connection...")
    print(f"📍 Host: {DB_CONFIG['host']}")
    print(f"📍 Port: {DB_CONFIG['port']}")
    print(f"📍 Database: {DB_CONFIG['database']}")
    print(f"📍 User: {DB_CONFIG['user']}")
    print("-" * 50)
    
    try:
        # Test connection
        start_time = time.time()
        print("🔌 Connecting to database...")
        
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        connection_time = (time.time() - start_time) * 1000
        print(f"✅ Connected successfully! ({connection_time:.2f}ms)")
        
        # Test basic query
        start_time = time.time()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        query_time = (time.time() - start_time) * 1000
        print(f"✅ Database version: {version}")
        print(f"✅ Query time: {query_time:.2f}ms")
        
        # Test database info
        start_time = time.time()
        cursor.execute("""
            SELECT 
                current_database() as database_name,
                current_user as current_user,
                inet_server_addr() as server_ip,
                inet_server_port() as server_port,
                now() as current_time
        """)
        info = cursor.fetchone()
        query_time = (time.time() - start_time) * 1000
        
        print(f"✅ Database name: {info[0]}")
        print(f"✅ Current user: {info[1]}")
        print(f"✅ Server IP: {info[2]}")
        print(f"✅ Server port: {info[3]}")
        print(f"✅ Current time: {info[4]}")
        print(f"✅ Info query time: {query_time:.2f}ms")
        
        # Test table creation (if not exists)
        start_time = time.time()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_table (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        query_time = (time.time() - start_time) * 1000
        print(f"✅ Test table created/verified ({query_time:.2f}ms)")
        
        # Test insert
        start_time = time.time()
        cursor.execute("""
            INSERT INTO test_table (name) 
            VALUES ('AWS RDS Test') 
            RETURNING id, created_at;
        """)
        result = cursor.fetchone()
        conn.commit()
        query_time = (time.time() - start_time) * 1000
        print(f"✅ Test record inserted: ID={result[0]}, Created={result[1]} ({query_time:.2f}ms)")
        
        # Test select
        start_time = time.time()
        cursor.execute("SELECT COUNT(*) FROM test_table;")
        count = cursor.fetchone()[0]
        query_time = (time.time() - start_time) * 1000
        print(f"✅ Test records count: {count} ({query_time:.2f}ms)")
        
        # Test performance
        print("\n🚀 Performance Test:")
        start_time = time.time()
        for i in range(10):
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        total_time = (time.time() - start_time) * 1000
        avg_time = total_time / 10
        print(f"✅ 10 simple queries: {total_time:.2f}ms total, {avg_time:.2f}ms average")
        
        # Clean up test data
        cursor.execute("DROP TABLE IF EXISTS test_table;")
        conn.commit()
        print("✅ Test table cleaned up")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 AWS RDS Database Test PASSED!")
        print("✅ Connection: Working")
        print("✅ Queries: Working")
        print("✅ Performance: Good")
        print("✅ Ready for application deployment!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return False

def test_network_connectivity():
    """Test basic network connectivity"""
    print("\n🌐 Testing Network Connectivity...")
    
    import socket
    
    try:
        # Test DNS resolution
        start_time = time.time()
        ip = socket.gethostbyname(DB_CONFIG['host'])
        dns_time = (time.time() - start_time) * 1000
        print(f"✅ DNS Resolution: {DB_CONFIG['host']} -> {ip} ({dns_time:.2f}ms)")
        
        # Test port connectivity
        start_time = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((ip, DB_CONFIG['port']))
        sock.close()
        connect_time = (time.time() - start_time) * 1000
        
        if result == 0:
            print(f"✅ Port {DB_CONFIG['port']} is open ({connect_time:.2f}ms)")
            return True
        else:
            print(f"❌ Port {DB_CONFIG['port']} is closed or filtered")
            return False
            
    except Exception as e:
        print(f"❌ Network Error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 AWS RDS PostgreSQL Connection Test")
    print("=" * 50)
    print(f"⏰ Test started at: {datetime.now()}")
    print()
    
    # Test network first
    if not test_network_connectivity():
        print("\n❌ Network connectivity failed. Check security groups and VPC configuration.")
        sys.exit(1)
    
    # Test database connection
    if test_connection():
        print("\n🎉 All tests passed! AWS RDS is ready for use.")
        sys.exit(0)
    else:
        print("\n❌ Database connection failed. Check credentials and database status.")
        sys.exit(1)
