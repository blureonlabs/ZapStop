#!/usr/bin/env python3
"""
Lambda function to test AWS RDS database connection
"""

import json
import psycopg2
import time

def lambda_handler(event, context):
    """Lambda handler to test database connection"""
    
    # Database configuration
    DB_CONFIG = {
        'host': 'zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com',
        'port': 5432,
        'database': 'zapstop',
        'user': 'zapstop',
        'password': 'ZapStop2024!'
    }
    
    try:
        # Test connection
        start_time = time.time()
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        connection_time = (time.time() - start_time) * 1000
        
        # Test basic query
        start_time = time.time()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        query_time = (time.time() - start_time) * 1000
        
        # Test database info
        cursor.execute("""
            SELECT 
                current_database() as database_name,
                current_user as current_user,
                inet_server_addr() as server_ip,
                inet_server_port() as server_port,
                now() as current_time
        """)
        info = cursor.fetchone()
        
        # Test table creation
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_table (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        
        # Test insert
        cursor.execute("""
            INSERT INTO test_table (name) 
            VALUES ('Lambda Test') 
            RETURNING id, created_at;
        """)
        result = cursor.fetchone()
        conn.commit()
        
        # Test select
        cursor.execute("SELECT COUNT(*) FROM test_table;")
        count = cursor.fetchone()[0]
        
        # Clean up
        cursor.execute("DROP TABLE IF EXISTS test_table;")
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Database connection successful!',
                'connection_time_ms': round(connection_time, 2),
                'query_time_ms': round(query_time, 2),
                'database_version': version,
                'database_name': info[0],
                'current_user': info[1],
                'server_ip': info[2],
                'server_port': info[3],
                'current_time': info[4].isoformat(),
                'test_record_id': result[0],
                'test_record_created': result[1].isoformat(),
                'total_records': count,
                'timestamp': time.time()
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Database connection failed',
                'message': str(e),
                'timestamp': time.time()
            })
        }
