#!/usr/bin/env python3
import os
import pg8000
import urllib.parse

def test_database_schema():
    """Test database schema and tables"""
    try:
        # Set up database connection
        url = 'postgresql://zapstop:ZapStop2024!@zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com:5432/zapstop'
        parsed = urllib.parse.urlparse(url)
        
        conn = pg8000.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],
            user=parsed.username,
            password=parsed.password,
            ssl_context=True
        )
        print("✅ Database connection successful!")
        
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        print(f"\n📋 Database tables ({len(tables)}):")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check if specific tables exist
        table_names = [table[0] for table in tables]
        
        if 'cars' in table_names:
            print("\n🚗 Cars table exists!")
            cursor.execute("SELECT COUNT(*) FROM cars;")
            cars_count = cursor.fetchone()[0]
            print(f"   Cars count: {cars_count}")
            
            # Check cars table structure
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'cars' 
                ORDER BY ordinal_position;
            """)
            columns = cursor.fetchall()
            print("   Cars table structure:")
            for col in columns:
                print(f"     - {col[0]}: {col[1]}")
        else:
            print("\n❌ Cars table does not exist!")
        
        if 'owners' in table_names:
            print("\n👥 Owners table exists!")
            cursor.execute("SELECT COUNT(*) FROM owners;")
            owners_count = cursor.fetchone()[0]
            print(f"   Owners count: {owners_count}")
        else:
            print("\n❌ Owners table does not exist!")
        
        if 'users' in table_names:
            print("\n👤 Users table exists!")
            cursor.execute("SELECT COUNT(*) FROM users;")
            users_count = cursor.fetchone()[0]
            print(f"   Users count: {users_count}")
            
            # Check drivers count
            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'driver';")
            drivers_count = cursor.fetchone()[0]
            print(f"   Drivers count: {drivers_count}")
        else:
            print("\n❌ Users table does not exist!")
        
        cursor.close()
        conn.close()
        print("\n✅ Database test completed successfully!")
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_database_schema()
