#!/usr/bin/env python3
"""
Lambda function to check database tables
"""

import json
import os
import psycopg2

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            host='zapstop-db.cxmisq4uo3xv.me-central-1.rds.amazonaws.com',
            port=5432,
            database='zapstop',
            user='zapstop',
            password='ZapStop2024!'
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def lambda_handler(event, context):
    """Lambda handler to check database tables"""
    try:
        # Parse the event
        http_method = event.get('httpMethod', 'GET')
        path = event.get('path', '/')
        
        if path == '/tables' or path == '/prod/tables':
            # Get database connection
            conn = get_db_connection()
            if not conn:
                return {
                    'statusCode': 500,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'error': 'Database connection failed'
                    })
                }
            
            cursor = conn.cursor()
            
            # Get all tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            table_names = [table[0] for table in tables]
            
            # Get detailed table information
            table_details = {}
            for table_name in table_names:
                # Get column information
                cursor.execute(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = '{table_name}' 
                    ORDER BY ordinal_position;
                """)
                columns = cursor.fetchall()
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                row_count = cursor.fetchone()[0]
                
                table_details[table_name] = {
                    'columns': [
                        {
                            'name': col[0],
                            'type': col[1],
                            'nullable': col[2] == 'YES',
                            'default': col[3]
                        } for col in columns
                    ],
                    'row_count': row_count
                }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'success',
                    'message': f'Found {len(table_names)} tables in database',
                    'tables': table_names,
                    'table_details': table_details,
                    'total_tables': len(table_names)
                })
            }
        
        elif path == '/health' or path == '/prod/health':
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'healthy',
                    'message': 'Table checker Lambda is running',
                    'endpoints': ['/tables', '/health']
                })
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Not found',
                    'available_endpoints': ['/tables', '/health']
                })
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
