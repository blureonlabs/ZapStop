"""
Driver earnings API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.earnings import DriverEarningCreate, DriverEarningUpdate, DriverEarningResponse
from app.services.earnings_service import EarningsService
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[DriverEarningResponse])
async def get_earnings(
    driver_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get earnings records"""
    earnings_service = EarningsService(db)
    
    # If driver_id is provided, check permissions
    if driver_id and current_user.role not in ["admin", "accountant"]:
        if current_user.id != driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    earnings = earnings_service.get_earnings(
        driver_id=driver_id or current_user.id,
        skip=skip,
        limit=limit
    )
    return earnings

@router.post("/", response_model=DriverEarningResponse)
async def create_earning(
    earning: DriverEarningCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new earnings record"""
    earnings_service = EarningsService(db)
    
    # Check permissions
    if current_user.role not in ["admin", "accountant"]:
        if current_user.id != earning.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    new_earning = earnings_service.create_earning(earning)
    return new_earning

@router.put("/{earning_id}", response_model=DriverEarningResponse)
async def update_earning(
    earning_id: str,
    earning_update: DriverEarningUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update earnings record"""
    earnings_service = EarningsService(db)
    
    # Get existing earning to check permissions
    existing_earning = earnings_service.get_earning_by_id(earning_id)
    if not existing_earning:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Earnings record not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "accountant"]:
        if current_user.id != existing_earning.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    updated_earning = earnings_service.update_earning(earning_id, earning_update)
    return updated_earning

@router.delete("/{earning_id}")
async def delete_earning(
    earning_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete earnings record (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    earnings_service = EarningsService(db)
    earning = earnings_service.get_earning_by_id(earning_id)
    
    if not earning:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Earnings record not found"
        )
    
    earnings_service.delete_earning(earning_id)
    return {"message": "Earnings record deleted successfully"}
