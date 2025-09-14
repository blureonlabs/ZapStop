"""
ZapStop Backend API - Lambda Optimized Version
FastAPI application optimized for AWS Lambda with Aurora Serverless v2
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from app.database_aurora import engine, Base, init_database, check_database_connection
from app.api import auth_simple as auth, users, cars, owners, analytics, earnings, expenses, attendance, leave_requests
from app.middleware.auth_simple import get_current_user
from app.models.user import User
from app.config import settings

# Initialize database tables
init_database()

app = FastAPI(
    title="ZapStop API",
    description="""
    ## ZapStop Rental Car Management System API - Lambda Version
    
    A comprehensive API for managing rental car operations including:
    
    * **Authentication** - JWT-based authentication with refresh tokens
    * **User Management** - Multi-role system (Admin, Accountant, Driver, Owner)
    * **Car Management** - Vehicle tracking and assignment
    * **Financial Analytics** - Earnings, expenses, and P&L analysis
    * **Attendance Tracking** - Driver work sessions
    * **Leave Management** - Request and approval system
    
    ### Authentication
    Most endpoints require authentication. Use the `/api/auth/login` endpoint to get an access token, then click the "Authorize" button above and enter: `Bearer YOUR_ACCESS_TOKEN`
    
    ### Roles
    - **Admin**: Full access to all endpoints
    - **Accountant**: Access to financial data and analytics
    - **Driver**: Access to own data and work-related endpoints
    - **Owner**: Access to car and financial data
    
    ### Database
    This API is connected to Amazon Aurora Serverless v2 (PostgreSQL) for reliable data persistence.
    """,
    version="1.0.0",
    contact={
        "name": "ZapStop Support",
        "email": "support@zapstop.com",
    },
    license_info={
        "name": "Proprietary",
        "url": "https://zapstop.com/license",
    },
    servers=[
        {
            "url": "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com",
            "description": "AWS Lambda API Gateway"
        }
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware - Lambda optimized
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(cars.router, prefix="/api/cars", tags=["cars"])
app.include_router(owners.router, prefix="/api/owners", tags=["owners"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(earnings.router, prefix="/api/earnings", tags=["earnings"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(leave_requests.router, prefix="/api/leave-requests", tags=["leave-requests"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ZapStop API is running on AWS Lambda",
        "version": "1.0.0",
        "docs": "/docs",
        "environment": os.getenv("STAGE", "dev")
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    db_healthy = check_database_connection()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "service": "zapstop-api-lambda",
        "database": "connected" if db_healthy else "disconnected",
        "environment": os.getenv("STAGE", "dev")
    }

@app.get("/api/health")
async def api_health_check():
    """API health check endpoint"""
    db_healthy = check_database_connection()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "api_version": "1.0.0",
        "database": "connected" if db_healthy else "disconnected",
        "environment": os.getenv("STAGE", "dev")
    }

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

# Lambda-specific startup event
@app.on_event("startup")
async def startup_event():
    """Lambda startup event"""
    print("ZapStop API Lambda function starting up...")
    print(f"Environment: {os.getenv('STAGE', 'dev')}")
    print(f"Region: {os.getenv('REGION', 'us-east-1')}")
    
    # Test database connection
    if check_database_connection():
        print("Database connection successful")
    else:
        print("Database connection failed")

# Lambda-specific shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Lambda shutdown event"""
    print("ZapStop API Lambda function shutting down...")
