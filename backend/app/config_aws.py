"""
AWS-optimized configuration settings for ZapStop Backend
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings

class AWSSettings(BaseSettings):
    """AWS-optimized application settings"""
    
    # Database - Aurora PostgreSQL
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/zapstop")
    
    # Aurora-specific optimizations
    database_pool_size: int = int(os.getenv("DATABASE_POOL_SIZE", "20"))  # Increased for Aurora
    database_max_overflow: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "30"))  # More connections
    database_pool_recycle: int = int(os.getenv("DATABASE_POOL_RECYCLE", "3600"))  # 1 hour
    database_pool_pre_ping: bool = True
    database_echo: bool = os.getenv("DATABASE_ECHO", "False").lower() == "true"
    
    # Redis - ElastiCache
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    redis_max_connections: int = int(os.getenv("REDIS_MAX_CONNECTIONS", "50"))
    redis_retry_on_timeout: bool = True
    redis_socket_keepalive: bool = True
    redis_socket_keepalive_options: dict = {1: 1, 2: 3, 3: 5}  # TCP keepalive settings
    
    # JWT Configuration
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    jwt_refresh_secret: str = os.getenv("JWT_REFRESH_SECRET", "your-refresh-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours
    jwt_refresh_token_expire_days: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # CORS Configuration
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,https://zapstop.netlify.app")
    
    @property
    def allowed_origins_list(self) -> list:
        """Convert comma-separated string to list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    # AWS Services
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    aws_access_key_id: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    
    # S3 Configuration
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "zapstop-uploads")
    s3_region: str = os.getenv("S3_REGION", "us-east-1")
    
    # CloudWatch Configuration
    cloudwatch_log_group: str = os.getenv("CLOUDWATCH_LOG_GROUP", "/ecs/zapstop")
    cloudwatch_log_stream: str = os.getenv("CLOUDWATCH_LOG_STREAM", "api")
    
    # Performance Settings
    max_workers: int = int(os.getenv("MAX_WORKERS", "4"))
    worker_class: str = os.getenv("WORKER_CLASS", "uvicorn.workers.UvicornWorker")
    
    # Caching Configuration
    cache_ttl: int = int(os.getenv("CACHE_TTL", "300"))  # 5 minutes
    cache_max_size: int = int(os.getenv("CACHE_MAX_SIZE", "1000"))
    
    # Rate Limiting
    rate_limit_requests: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    rate_limit_window: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # 1 minute
    
    # Email Service
    resend_api_key: Optional[str] = os.getenv("RESEND_API_KEY")
    
    # SMS Service
    twilio_account_sid: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    
    # Application Settings
    app_name: str = "ZapStop API"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # Health Check
    health_check_path: str = "/health"
    
    # Monitoring
    enable_metrics: bool = os.getenv("ENABLE_METRICS", "True").lower() == "true"
    metrics_port: int = int(os.getenv("METRICS_PORT", "9090"))
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
aws_settings = AWSSettings()
