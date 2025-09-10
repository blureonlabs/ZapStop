"""
Attendance service
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_attendance(self, driver_id: str = None, skip: int = 0, limit: int = 100) -> List[Attendance]:
        """Get attendance records"""
        query = self.db.query(Attendance)
        
        if driver_id:
            query = query.filter(Attendance.driver_id == driver_id)
        
        return query.offset(skip).limit(limit).all()
    
    def get_attendance_by_id(self, attendance_id: str) -> Optional[Attendance]:
        """Get attendance by ID"""
        return self.db.query(Attendance).filter(Attendance.id == attendance_id).first()
    
    def get_today_attendance(self, driver_id: str) -> Optional[Attendance]:
        """Get today's attendance for driver"""
        today = date.today()
        return self.db.query(Attendance).filter(
            Attendance.driver_id == driver_id,
            Attendance.date == today
        ).first()
    
    def start_work(self, driver_id: str) -> bool:
        """Start work session"""
        today = date.today()
        existing_attendance = self.get_today_attendance(driver_id)
        
        if existing_attendance and existing_attendance.start_time:
            return False  # Already started work today
        
        if existing_attendance:
            # Update existing record
            existing_attendance.start_time = datetime.now()
            existing_attendance.status = AttendanceStatus.PRESENT
        else:
            # Create new record
            new_attendance = Attendance(
                driver_id=driver_id,
                date=today,
                start_time=datetime.now(),
                status=AttendanceStatus.PRESENT
            )
            self.db.add(new_attendance)
        
        self.db.commit()
        return True
    
    def end_work(self, driver_id: str) -> bool:
        """End work session"""
        today = date.today()
        attendance = self.get_today_attendance(driver_id)
        
        if not attendance or not attendance.start_time or attendance.end_time:
            return False  # No active work session
        
        attendance.end_time = datetime.now()
        self.db.commit()
        return True
    
    def get_current_status(self, driver_id: str) -> dict:
        """Get current work status"""
        today = date.today()
        attendance = self.get_today_attendance(driver_id)
        
        if not attendance:
            return {
                "is_working": False,
                "start_time": None,
                "end_time": None,
                "status": "not_started"
            }
        
        is_working = attendance.start_time and not attendance.end_time
        
        return {
            "is_working": is_working,
            "start_time": attendance.start_time.isoformat() if attendance.start_time else None,
            "end_time": attendance.end_time.isoformat() if attendance.end_time else None,
            "status": "working" if is_working else "completed" if attendance.end_time else "not_started"
        }
