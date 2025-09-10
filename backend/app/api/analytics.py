"""
Analytics API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.analytics_service import AnalyticsService
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/dashboard", summary="Get Dashboard Data", description="Get comprehensive dashboard analytics data")
async def get_dashboard_data(
    time_filter: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get dashboard analytics data.
    
    - **time_filter**: Time period for analytics (daily, weekly, monthly, yearly)
    
    Returns comprehensive dashboard data including:
    - Total earnings, expenses, and net profit
    - Platform breakdown (Uber, Bolt, Individual)
    - Company statistics (cars, drivers, owners)
    - Daily trends and car performance metrics
    """
    analytics_service = AnalyticsService(db)
    
    try:
        data = analytics_service.get_dashboard_data(time_filter)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}"
        )

@router.get("/earnings")
async def get_earnings_analytics(
    time_filter: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get earnings analytics"""
    analytics_service = AnalyticsService(db)
    
    try:
        data = analytics_service.get_earnings_analytics(time_filter)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch earnings analytics: {str(e)}"
        )

@router.get("/expenses")
async def get_expenses_analytics(
    time_filter: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get expenses analytics"""
    analytics_service = AnalyticsService(db)
    
    try:
        data = analytics_service.get_expenses_analytics(time_filter)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch expenses analytics: {str(e)}"
        )

@router.get("/profit-loss")
async def get_profit_loss_analytics(
    time_filter: str = "monthly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get profit and loss analytics"""
    analytics_service = AnalyticsService(db)
    
    try:
        data = analytics_service.get_profit_loss_analytics(time_filter)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profit/loss analytics: {str(e)}"
        )
