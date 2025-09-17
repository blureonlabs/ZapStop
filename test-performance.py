#!/usr/bin/env python3
"""
Performance Test Script for ZapStop
Tests database query performance before and after optimizations
"""

import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
import json

def test_database_performance():
    """Test database performance with optimized queries"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        print("Please set DATABASE_URL in your .env file")
        return
    
    try:
        # Connect to database
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("✅ Connected to database successfully!")
        
        # Test 1: Dashboard query performance
        print("\n📊 Testing Dashboard Query Performance...")
        
        start_time = time.time()
        
        # Run the optimized dashboard query
        cursor.execute("""
            WITH earnings_summary AS (
                SELECT 
                    COALESCE(SUM(uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account), 0) as total_earnings,
                    COALESCE(SUM(uber_cash + uber_account), 0) as uber_earnings,
                    COALESCE(SUM(bolt_cash + bolt_account), 0) as bolt_earnings,
                    COALESCE(SUM(individual_rides_cash + individual_rides_account), 0) as individual_earnings,
                    COUNT(*) as total_earning_records
                FROM driver_earnings 
                WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            ),
            expenses_summary AS (
                SELECT 
                    COALESCE(SUM(amount), 0) as total_expenses,
                    COUNT(*) as total_expense_records
                FROM driver_expenses 
                WHERE date >= CURRENT_DATE - INTERVAL '30 days'
            ),
            company_stats AS (
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
                    (SELECT COUNT(*) FROM cars) as total_cars,
                    (SELECT COUNT(*) FROM owners) as total_owners,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins
            )
            SELECT 
                e.total_earnings,
                e.uber_earnings,
                e.bolt_earnings,
                e.individual_earnings,
                e.total_earning_records,
                ex.total_expenses,
                ex.total_expense_records,
                cs.total_drivers,
                cs.total_cars,
                cs.total_owners,
                cs.total_admins
            FROM earnings_summary e, expenses_summary ex, company_stats cs
        """)
        
        result = cursor.fetchone()
        query_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        print(f"✅ Dashboard query completed in {query_time:.2f}ms")
        print(f"📈 Results: {dict(result)}")
        
        # Test 2: Check if indexes exist
        print("\n🔍 Checking Database Indexes...")
        
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public'
            AND indexname LIKE 'idx_%'
            ORDER BY idx_scan DESC
        """)
        
        indexes = cursor.fetchall()
        
        if indexes:
            print("✅ Found optimized indexes:")
            for idx in indexes:
                print(f"  - {idx['indexname']} (scans: {idx['idx_scan']})")
        else:
            print("⚠️  No optimized indexes found. Run the database optimization SQL first!")
        
        # Test 3: Check table sizes
        print("\n📏 Checking Table Sizes...")
        
        cursor.execute("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        """)
        
        tables = cursor.fetchall()
        for table in tables:
            print(f"  - {table['tablename']}: {table['size']}")
        
        # Performance assessment
        print("\n🎯 Performance Assessment:")
        if query_time < 100:
            print("✅ EXCELLENT: Query time under 100ms")
        elif query_time < 500:
            print("✅ GOOD: Query time under 500ms")
        elif query_time < 1000:
            print("⚠️  FAIR: Query time under 1 second")
        else:
            print("❌ SLOW: Query time over 1 second - needs optimization")
        
        print(f"\n📊 Dashboard Query Time: {query_time:.2f}ms")
        print(f"🔍 Indexes Found: {len(indexes)}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Performance test completed!")
        
    except Exception as e:
        print(f"❌ Error testing database performance: {e}")
        print("\n💡 Make sure to:")
        print("1. Set DATABASE_URL in your .env file")
        print("2. Run the database optimization SQL first")
        print("3. Check your database connection")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    test_database_performance()
