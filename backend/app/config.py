"""
Configuration settings for ZapStop Backend
"""

import os
from typing import Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/zapstop")
    
    # Neon-specific settings
    database_pool_size: int = int(os.getenv("DATABASE_POOL_SIZE", "5"))
    database_max_overflow: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "10"))
    database_pool_recycle: int = int(os.getenv("DATABASE_POOL_RECYCLE", "300"))
    
    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # JWT
    jwt_secret: str = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
    jwt_refresh_secret: str = os.getenv("JWT_REFRESH_SECRET", "your-refresh-secret-key-change-in-production")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 480  # 8 hours
    jwt_refresh_token_expire_days: int = 7
    
    # CORS
    allowed_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,https://yourdomain.com")
    
    @property
    def allowed_origins_list(self) -> list:
        """Convert comma-separated string to list"""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    # File Storage
    aws_access_key_id: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_s3_bucket: Optional[str] = os.getenv("AWS_S3_BUCKET")
    
    # Email
    resend_api_key: Optional[str] = os.getenv("RESEND_API_KEY")
    
    # SMS
    twilio_account_sid: Optional[str] = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth_token: Optional[str] = os.getenv("TWILIO_AUTH_TOKEN")
    
    # App
    app_name: str = "ZapStop API"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Global settings instance
settings = Settings()
