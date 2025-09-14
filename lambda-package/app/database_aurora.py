"""
Aurora Serverless v2 database configuration with AWS Secrets Manager
Optimized for Lambda with connection pooling
"""

import os
import json
import boto3
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool, NullPool
from sqlalchemy.engine import Engine
from typing import Optional
from botocore.exceptions import ClientError

# Base class for models
Base = declarative_base()

class AuroraDatabaseManager:
    """Manages Aurora Serverless v2 connections with Secrets Manager"""
    
    def __init__(self):
        self._engine: Optional[Engine] = None
        self._secrets_client = boto3.client('secretsmanager', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        self._secrets_cache = {}
        
    def get_secret(self, secret_name: str) -> dict:
        """Get secret from AWS Secrets Manager with caching"""
        if secret_name in self._secrets_cache:
            return self._secrets_cache[secret_name]
            
        try:
            response = self._secrets_client.get_secret_value(SecretId=secret_name)
            secret = json.loads(response['SecretString'])
            self._secrets_cache[secret_name] = secret
            return secret
        except ClientError as e:
            print(f"Error retrieving secret {secret_name}: {e}")
            raise
    
    def get_database_credentials(self) -> dict:
        """Get database credentials from Secrets Manager"""
        secret_name = os.getenv('DB_SECRET_NAME', 'zapstop/aurora/credentials')
        return self.get_secret(secret_name)
    
    def create_database_engine(self) -> Engine:
        """Create SQLAlchemy engine for Aurora Serverless v2"""
        if self._engine:
            return self._engine
            
        try:
            # Get credentials from Secrets Manager
            db_creds = self.get_database_credentials()
            
            # Construct connection string
            connection_string = (
                f"postgresql://{db_creds['username']}:{db_creds['password']}"
                f"@{db_creds['host']}:{db_creds['port']}/{db_creds['dbname']}"
            )
            
            # Add SSL parameters for Aurora
            ssl_params = "?sslmode=require"
            if 'sslcert' in db_creds:
                ssl_params += f"&sslcert={db_creds['sslcert']}"
            if 'sslkey' in db_creds:
                ssl_params += f"&sslkey={db_creds['sslkey']}"
            if 'sslrootcert' in db_creds:
                ssl_params += f"&sslrootcert={db_creds['sslrootcert']}"
                
            connection_string += ssl_params
            
            # Lambda-optimized connection pooling
            # Use NullPool for Lambda to avoid connection issues
            pool_class = NullPool if os.getenv('AWS_LAMBDA_FUNCTION_NAME') else QueuePool
            
            self._engine = create_engine(
                connection_string,
                poolclass=pool_class,
                pool_size=1 if os.getenv('AWS_LAMBDA_FUNCTION_NAME') else 5,
                max_overflow=0 if os.getenv('AWS_LAMBDA_FUNCTION_NAME') else 10,
                pool_pre_ping=True,
                pool_recycle=300,
                echo=os.getenv('DEBUG', 'false').lower() == 'true',
                # Aurora-specific optimizations
                connect_args={
                    'connect_timeout': 10,
                    'application_name': 'zapstop-lambda'
                }
            )
            
            return self._engine
            
        except Exception as e:
            print(f"Error creating database engine: {e}")
            raise
    
    def get_session_factory(self):
        """Get SQLAlchemy session factory"""
        engine = self.create_database_engine()
        return sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Global database manager instance
db_manager = AuroraDatabaseManager()

# Lazy initialization - these will be created on first use
_engine = None
_SessionLocal = None

def get_engine():
    """Get database engine, creating it if necessary"""
    global _engine
    if _engine is None:
        _engine = db_manager.create_database_engine()
    return _engine

def get_session_factory():
    """Get session factory, creating it if necessary"""
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = db_manager.get_session_factory()
    return _SessionLocal

def get_db() -> Session:
    """Dependency to get database session for FastAPI"""
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Alternative async database functions for async endpoints
async def get_async_db():
    """Async database session (if using async SQLAlchemy)"""
    # This would require asyncpg and async SQLAlchemy setup
    # For now, using sync version
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Health check function
def check_database_connection() -> bool:
    """Check if database connection is healthy"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"Database connection check failed: {e}")
        return False

# Initialize tables (call this in Lambda handler)
def init_database():
    """Initialize database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully")
    except Exception as e:
        print(f"Error initializing database tables: {e}")
        raise
