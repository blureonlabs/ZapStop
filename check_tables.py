#!/usr/bin/env python3
"""
Simple script to check tables in RDS database
"""

import psycopg2

def check_database_tables():
    """Check what tables exist in the RDS database"""
    try:
        # Database connection
        conn = psycopg2.connect(
            host='zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com',
            port=5432,
            database='zapstop',
            user='zapstop',
            password='ZapStop2024!'
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
        
        # Get table details
        if tables:
            print(f"\n📊 Table details:")
            for table in tables:
                table_name = table[0]
                cursor.execute(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    ORDER BY ordinal_position;
                """)
                columns = cursor.fetchall()
                print(f"\n  Table: {table_name}")
                for col in columns:
                    nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                    default = f" DEFAULT {col[3]}" if col[3] else ""
                    print(f"    - {col[0]}: {col[1]} {nullable}{default}")
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cursor.fetchone()[0]
                print(f"    Rows: {count}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_database_tables()
