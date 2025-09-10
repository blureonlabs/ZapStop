"""
Leave requests API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.leave_requests import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestResponse
from app.services.leave_requests_service import LeaveRequestsService
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[LeaveRequestResponse])
async def get_leave_requests(
    driver_id: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leave requests"""
    leave_requests_service = LeaveRequestsService(db)
    
    # If driver_id is provided, check permissions
    if driver_id and current_user.role not in ["admin", "accountant"]:
        if current_user.id != driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    leave_requests = leave_requests_service.get_leave_requests(
        driver_id=driver_id or current_user.id,
        status=status,
        skip=skip,
        limit=limit
    )
    return leave_requests

@router.post("/", response_model=LeaveRequestResponse)
async def create_leave_request(
    leave_request: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new leave request"""
    leave_requests_service = LeaveRequestsService(db)
    
    # Check permissions
    if current_user.role not in ["admin", "accountant"]:
        if current_user.id != leave_request.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    new_leave_request = leave_requests_service.create_leave_request(leave_request)
    return new_leave_request

@router.put("/{leave_request_id}", response_model=LeaveRequestResponse)
async def update_leave_request(
    leave_request_id: str,
    leave_request_update: LeaveRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update leave request"""
    leave_requests_service = LeaveRequestsService(db)
    
    # Get existing leave request to check permissions
    existing_leave_request = leave_requests_service.get_leave_request_by_id(leave_request_id)
    if not existing_leave_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "accountant"]:
        if current_user.id != existing_leave_request.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    updated_leave_request = leave_requests_service.update_leave_request(leave_request_id, leave_request_update)
    return updated_leave_request

@router.put("/{leave_request_id}/approve")
async def approve_leave_request(
    leave_request_id: str,
    admin_notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve leave request (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    leave_requests_service = LeaveRequestsService(db)
    result = leave_requests_service.approve_leave_request(leave_request_id, current_user.id, admin_notes)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to approve leave request"
        )
    
    return {"message": "Leave request approved successfully"}

@router.put("/{leave_request_id}/reject")
async def reject_leave_request(
    leave_request_id: str,
    admin_notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject leave request (Admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    leave_requests_service = LeaveRequestsService(db)
    result = leave_requests_service.reject_leave_request(leave_request_id, current_user.id, admin_notes)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reject leave request"
        )
    
    return {"message": "Leave request rejected successfully"}
