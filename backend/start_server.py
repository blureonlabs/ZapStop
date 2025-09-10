#!/usr/bin/env python3
"""
Startup script for ZapStop API with Neon database
"""

import os
import sys
import uvicorn
from pathlib import Path

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def check_env_file():
    """Check if .env file exists"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  Warning: .env file not found!")
        print("Please create a .env file based on env.example")
        print("Make sure to set your Neon DATABASE_URL")
        return False
    return True

def main():
    """Main startup function"""
    print("🚀 Starting ZapStop API Server...")
    
    # Check environment file
    if not check_env_file():
        print("Please create .env file and try again")
        sys.exit(1)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Check if DATABASE_URL is set
    if not os.getenv("DATABASE_URL"):
        print("❌ DATABASE_URL not set in environment variables")
        print("Please set your Neon database URL in the .env file")
        sys.exit(1)
    
    print("✅ Environment configuration loaded")
    print(f"Database: {os.getenv('DATABASE_URL', 'Not set')[:50]}...")
    
    # Start the server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
