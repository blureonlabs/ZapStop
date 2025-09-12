"""
Attendance API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceResponse
from app.services.attendance_service_simple import AttendanceServiceSimple as AttendanceService
from app.middleware.auth_simple import get_current_user
router = APIRouter()

@router.get("/", response_model=List[AttendanceResponse])
async def get_attendance(
    driver_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get attendance records"""
    attendance_service = AttendanceService(db)
    
    # If driver_id is provided, check permissions
    if driver_id and current_user["role"] not in ["admin", "accountant"]:
        if current_user["id"] != driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    # Only filter by driver_id if explicitly provided, otherwise get all records for admin/accountant
    if driver_id:
        attendance = attendance_service.get_attendance(
            driver_id=driver_id,
            skip=skip,
            limit=limit
        )
    elif current_user["role"] in ["admin", "accountant"]:
        # Admin and accountant can see all attendance records
        attendance = attendance_service.get_attendance(
            skip=skip,
            limit=limit
        )
    else:
        # Regular users can only see their own records
        attendance = attendance_service.get_attendance(
            driver_id=current_user["id"],
            skip=skip,
            limit=limit
        )
    return attendance

@router.post("/", response_model=AttendanceResponse)
async def create_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create attendance record"""
    # Only admin, accountant, or the driver themselves can create attendance
    if current_user["role"] not in ["admin", "accountant"]:
        if current_user["id"] != attendance.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    attendance_service = AttendanceService(db)
    
    try:
        created_attendance = attendance_service.create_attendance(attendance)
        return created_attendance
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create attendance: {str(e)}"
        )

@router.post("/start-work")
async def start_work(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Start work session"""
    if current_user["role"] != "driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only drivers can start work"
        )
    
    attendance_service = AttendanceService(db)
    result = attendance_service.start_work(current_user["id"])
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to start work session"
        )
    
    return {"message": "Work started successfully"}

@router.post("/end-work")
async def end_work(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """End work session"""
    if current_user["role"] != "driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only drivers can end work"
        )
    
    attendance_service = AttendanceService(db)
    result = attendance_service.end_work(current_user["id"])
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to end work session"
        )
    
    return {"message": "Work ended successfully"}

@router.get("/current-status")
async def get_current_status(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get current work status"""
    if current_user["role"] != "driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only drivers can check work status"
        )
    
    attendance_service = AttendanceService(db)
    status = attendance_service.get_current_status(current_user["id"])
    
    return status
