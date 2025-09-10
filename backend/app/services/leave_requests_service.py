"""
Leave requests service
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.leave_requests import LeaveRequest, LeaveStatus
from app.schemas.leave_requests import LeaveRequestCreate, LeaveRequestUpdate

class LeaveRequestsService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_leave_requests(self, driver_id: str = None, status: str = None, skip: int = 0, limit: int = 100) -> List[LeaveRequest]:
        """Get leave requests"""
        query = self.db.query(LeaveRequest)
        
        if driver_id:
            query = query.filter(LeaveRequest.driver_id == driver_id)
        
        if status:
            query = query.filter(LeaveRequest.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    def get_leave_request_by_id(self, leave_request_id: str) -> Optional[LeaveRequest]:
        """Get leave request by ID"""
        return self.db.query(LeaveRequest).filter(LeaveRequest.id == leave_request_id).first()
    
    def create_leave_request(self, leave_request: LeaveRequestCreate) -> LeaveRequest:
        """Create new leave request"""
        db_leave_request = LeaveRequest(
            driver_id=leave_request.driver_id,
            leave_type=leave_request.leave_type,
            start_date=leave_request.start_date,
            end_date=leave_request.end_date,
            reason=leave_request.reason
        )
        
        self.db.add(db_leave_request)
        self.db.commit()
        self.db.refresh(db_leave_request)
        return db_leave_request
    
    def update_leave_request(self, leave_request_id: str, leave_request_update: LeaveRequestUpdate) -> LeaveRequest:
        """Update leave request"""
        db_leave_request = self.get_leave_request_by_id(leave_request_id)
        if not db_leave_request:
            return None
        
        update_data = leave_request_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_leave_request, field, value)
        
        self.db.commit()
        self.db.refresh(db_leave_request)
        return db_leave_request
    
    def approve_leave_request(self, leave_request_id: str, approved_by: str, admin_notes: str = None) -> bool:
        """Approve leave request"""
        db_leave_request = self.get_leave_request_by_id(leave_request_id)
        if not db_leave_request:
            return False
        
        db_leave_request.status = LeaveStatus.APPROVED
        db_leave_request.approved_by = approved_by
        if admin_notes:
            db_leave_request.admin_notes = admin_notes
        
        self.db.commit()
        return True
    
    def reject_leave_request(self, leave_request_id: str, approved_by: str, admin_notes: str = None) -> bool:
        """Reject leave request"""
        db_leave_request = self.get_leave_request_by_id(leave_request_id)
        if not db_leave_request:
            return False
        
        db_leave_request.status = LeaveStatus.REJECTED
        db_leave_request.approved_by = approved_by
        if admin_notes:
            db_leave_request.admin_notes = admin_notes
        
        self.db.commit()
        return True
