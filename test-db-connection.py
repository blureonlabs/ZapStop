#!/usr/bin/env python3
"""
Test database connection and performance
"""

import os
import time
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/.env')

def test_database_connection():
    """Test database connection and performance"""
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return
    
    print("🔌 Testing database connection...")
    
    try:
        # Test connection
        start_time = time.time()
        conn = psycopg2.connect(database_url)
        connection_time = (time.time() - start_time) * 1000
        
        print(f"✅ Connected to database in {connection_time:.2f}ms")
        
        # Test simple query
        start_time = time.time()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        query_time = (time.time() - start_time) * 1000
        
        print(f"✅ Simple query executed in {query_time:.2f}ms")
        
        # Test table existence
        start_time = time.time()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        table_query_time = (time.time() - start_time) * 1000
        
        print(f"✅ Table query executed in {table_query_time:.2f}ms")
        print(f"📋 Found {len(tables)} tables: {[t[0] for t in tables]}")
        
        # Test index existence
        start_time = time.time()
        cursor.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_%'
            ORDER BY indexname
        """)
        indexes = cursor.fetchall()
        index_query_time = (time.time() - start_time) * 1000
        
        print(f"✅ Index query executed in {index_query_time:.2f}ms")
        print(f"🔍 Found {len(indexes)} optimized indexes: {[i[0] for i in indexes]}")
        
        # Performance assessment
        print(f"\n📊 Performance Summary:")
        print(f"   Connection: {connection_time:.2f}ms")
        print(f"   Simple query: {query_time:.2f}ms")
        print(f"   Table query: {table_query_time:.2f}ms")
        print(f"   Index query: {index_query_time:.2f}ms")
        
        if connection_time < 100 and query_time < 50:
            print("✅ EXCELLENT: Database performance is great!")
        elif connection_time < 500 and query_time < 200:
            print("✅ GOOD: Database performance is acceptable")
        else:
            print("⚠️  SLOW: Database performance needs improvement")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")

if __name__ == "__main__":
    test_database_connection()
