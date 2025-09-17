"""
AWS-optimized database configuration with Aurora PostgreSQL and connection pooling
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.engine import Engine
import redis
import logging
from app.config_aws import aws_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database engine with Aurora-optimized settings
engine = create_engine(
    aws_settings.database_url,
    poolclass=QueuePool,
    pool_size=aws_settings.database_pool_size,
    max_overflow=aws_settings.database_max_overflow,
    pool_pre_ping=aws_settings.database_pool_pre_ping,
    pool_recycle=aws_settings.database_pool_recycle,
    echo=aws_settings.database_echo,
    # Aurora-specific optimizations
    connect_args={
        "options": "-c default_transaction_isolation=read committed",
        "application_name": "zapstop-api",
        "connect_timeout": 10,
        "command_timeout": 30,
    },
    # Connection pool optimizations
    pool_timeout=30,
    pool_reset_on_return="commit",
)

# Add connection event listeners for monitoring
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set connection-level optimizations"""
    with dbapi_connection.cursor() as cursor:
        # Aurora PostgreSQL optimizations
        cursor.execute("SET statement_timeout = '30s'")
        cursor.execute("SET idle_in_transaction_session_timeout = '60s'")
        cursor.execute("SET lock_timeout = '10s'")

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log connection checkout for monitoring"""
    logger.debug("Connection checked out from pool")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Log connection checkin for monitoring"""
    logger.debug("Connection checked in to pool")

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db() -> Session:
    """Dependency to get database session with proper error handling"""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Redis connection pool
redis_pool = None

def get_redis_connection():
    """Get Redis connection with connection pooling"""
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.ConnectionPool.from_url(
            aws_settings.redis_url,
            max_connections=aws_settings.redis_max_connections,
            retry_on_timeout=aws_settings.redis_retry_on_timeout,
            socket_keepalive=aws_settings.redis_socket_keepalive,
            socket_keepalive_options=aws_settings.redis_socket_keepalive_options,
            decode_responses=True,
            health_check_interval=30,
        )
    return redis.Redis(connection_pool=redis_pool)

def get_redis() -> redis.Redis:
    """Dependency to get Redis connection"""
    return get_redis_connection()

# Database health check
def check_database_health() -> bool:
    """Check if database is healthy"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

# Redis health check
def check_redis_health() -> bool:
    """Check if Redis is healthy"""
    try:
        redis_conn = get_redis_connection()
        redis_conn.ping()
        return True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False

# Connection pool monitoring
def get_connection_pool_status():
    """Get current connection pool status"""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
        "invalid": pool.invalid(),
    }

# Database query optimization utilities
class DatabaseOptimizer:
    """Utility class for database query optimizations"""
    
    @staticmethod
    def add_indexes():
        """Add database indexes for better performance"""
        # This would be implemented with Alembic migrations
        # For now, we'll define the indexes that should be created
        indexes = [
            # Users table indexes
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);",
            "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);",
            
            # Cars table indexes
            "CREATE INDEX IF NOT EXISTS idx_cars_license_plate ON cars(license_plate);",
            "CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);",
            "CREATE INDEX IF NOT EXISTS idx_cars_driver_id ON cars(driver_id);",
            
            # Earnings table indexes
            "CREATE INDEX IF NOT EXISTS idx_earnings_driver_id ON driver_earnings(driver_id);",
            "CREATE INDEX IF NOT EXISTS idx_earnings_date ON driver_earnings(date);",
            "CREATE INDEX IF NOT EXISTS idx_earnings_platform ON driver_earnings(platform);",
            "CREATE INDEX IF NOT EXISTS idx_earnings_driver_date ON driver_earnings(driver_id, date);",
            
            # Expenses table indexes
            "CREATE INDEX IF NOT EXISTS idx_expenses_driver_id ON driver_expenses(driver_id);",
            "CREATE INDEX IF NOT EXISTS idx_expenses_status ON driver_expenses(status);",
            "CREATE INDEX IF NOT EXISTS idx_expenses_date ON driver_expenses(date);",
            "CREATE INDEX IF NOT EXISTS idx_expenses_driver_status ON driver_expenses(driver_id, status);",
            
            # Attendance table indexes
            "CREATE INDEX IF NOT EXISTS idx_attendance_driver_id ON attendance(driver_id);",
            "CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);",
            "CREATE INDEX IF NOT EXISTS idx_attendance_driver_date ON attendance(driver_id, date);",
        ]
        return indexes
    
    @staticmethod
    def get_query_hints():
        """Get query optimization hints for common queries"""
        return {
            "analytics_dashboard": "Use materialized views for complex analytics",
            "user_lookup": "Use email index for user lookups",
            "earnings_by_date": "Use composite index on (driver_id, date)",
            "expenses_pending": "Use composite index on (status, created_at)",
        }

# Initialize database optimizer
db_optimizer = DatabaseOptimizer()
