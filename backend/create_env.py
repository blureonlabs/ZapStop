#!/usr/bin/env python3
"""
Create a proper .env file with the correct DATABASE_URL
"""

def create_env_file():
    env_content = """# Database Configuration
DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/zapstop?sslmode=require

# Redis Configuration (Optional - for caching)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# Application Configuration
DEBUG=True
ENVIRONMENT=development

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://yourdomain.com

# File Storage (Optional - for file uploads)
# FILE_STORAGE_PATH=uploads

# Email Service (Optional)
RESEND_API_KEY=your-resend-api-key

# SMS Service (Optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
"""
    
    with open('.env', 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print("✅ Created .env file with proper encoding")

if __name__ == "__main__":
    create_env_file()

