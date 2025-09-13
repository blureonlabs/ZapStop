"""
ZapStop Backend API
FastAPI application for rental car management system
"""

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from app.database import engine, Base
from app.api import auth_simple as auth, users, cars, owners, analytics, earnings, expenses, attendance, leave_requests
from app.middleware.auth_simple import get_current_user
from app.models.user import User
from app.config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ZapStop API",
    description="""
    ## ZapStop Rental Car Management System API
    
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
    
    ### Rate Limiting
    API requests are rate limited to prevent abuse. Contact support if you need higher limits.
    
    ### Database
    This API is connected to Neon PostgreSQL database for reliable data persistence.
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
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://zapstop-backend.onrender.com",
            "description": "Production server"
        }
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.onrender.com", "*.netlify.app"]
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
        "message": "ZapStop API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "zapstop-api"
    }

@app.get("/api/health")
async def api_health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "api_version": "1.0.0",
        "database": "connected"
    }

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code}
    )

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
