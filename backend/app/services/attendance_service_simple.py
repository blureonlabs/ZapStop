"""
Simple Attendance service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate

class AttendanceServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_attendance(self, skip: int = 0, limit: int = 100, driver_id: Optional[str] = None) -> List[dict]:
        """Get attendance using direct SQL"""
        if driver_id:
            result = self.db.execute(
                text("""
                    SELECT 
                        a.id, a.driver_id, a.date, a.start_time, a.end_time, a.status,
                        a.created_at, a.updated_at, u.name as driver_name, u.email as driver_email
                    FROM attendance a
                    JOIN users u ON a.driver_id = u.id
                    WHERE a.driver_id = :driver_id
                    ORDER BY a.date DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"driver_id": driver_id, "skip": skip, "limit": limit}
            )
        else:
            result = self.db.execute(
                text("""
                    SELECT 
                        a.id, a.driver_id, a.date, a.start_time, a.end_time, a.status,
                        a.created_at, a.updated_at, u.name as driver_name, u.email as driver_email
                    FROM attendance a
                    JOIN users u ON a.driver_id = u.id
                    ORDER BY a.date DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"skip": skip, "limit": limit}
            )
        
        attendance_records = []
        for row in result:
            attendance_records.append({
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "date": row[2].isoformat() if row[2] else None,
                "start_time": row[3].isoformat() if row[3] else None,
                "end_time": row[4].isoformat() if row[4] else None,
                "status": row[5],
                "created_at": row[6].isoformat() if row[6] else None,
                "updated_at": row[7].isoformat() if row[7] else None,
                "driver_name": row[8],
                "driver_email": row[9]
            })
        return attendance_records
    
    def get_attendance_by_id(self, attendance_id: str) -> Optional[dict]:
        """Get attendance by ID using direct SQL"""
        result = self.db.execute(
            text("""
                SELECT 
                    a.id, a.driver_id, a.date, a.start_time, a.end_time, a.status,
                    a.created_at, a.updated_at, u.name as driver_name, u.email as driver_email
                FROM attendance a
                JOIN users u ON a.driver_id = u.id
                WHERE a.id = :attendance_id
            """),
            {"attendance_id": attendance_id}
        )
        
        row = result.fetchone()
        if row:
            return {
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "date": row[2].isoformat() if row[2] else None,
                "start_time": row[3].isoformat() if row[3] else None,
                "end_time": row[4].isoformat() if row[4] else None,
                "status": row[5],
                "created_at": row[6].isoformat() if row[6] else None,
                "updated_at": row[7].isoformat() if row[7] else None,
                "driver_name": row[8],
                "driver_email": row[9]
            }
        return None
    
    def create_attendance(self, attendance: AttendanceCreate) -> dict:
        """Create new attendance using direct SQL"""
        result = self.db.execute(
            text("""
                INSERT INTO attendance (
                    driver_id, date, start_time, end_time, status, created_at, updated_at
                )
                VALUES (
                    :driver_id, :date, :start_time, :end_time, :status, NOW(), NOW()
                )
                RETURNING id, driver_id, date, start_time, end_time, status, created_at, updated_at
            """),
            {
                "driver_id": attendance.driver_id,
                "date": attendance.date,
                "start_time": attendance.start_time,
                "end_time": attendance.end_time,
                "status": attendance.status
            }
        )
        
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "date": row[2].isoformat() if row[2] else None,
            "start_time": row[3].isoformat() if row[3] else None,
            "end_time": row[4].isoformat() if row[4] else None,
            "status": row[5],
            "created_at": row[6].isoformat() if row[6] else None,
            "updated_at": row[7].isoformat() if row[7] else None
        }
    
    def update_attendance(self, attendance_id: str, attendance_update: AttendanceUpdate) -> Optional[dict]:
        """Update attendance using direct SQL"""
        # Get current attendance
        current_attendance = self.get_attendance_by_id(attendance_id)
        if not current_attendance:
            return None
        
        # Build update query dynamically
        update_fields = []
        update_data = {"attendance_id": attendance_id}
        
        if attendance_update.date is not None:
            update_fields.append("date = :date")
            update_data["date"] = attendance_update.date
        
        if attendance_update.start_time is not None:
            update_fields.append("start_time = :start_time")
            update_data["start_time"] = attendance_update.start_time
        
        if attendance_update.end_time is not None:
            update_fields.append("end_time = :end_time")
            update_data["end_time"] = attendance_update.end_time
        
        if attendance_update.status is not None:
            update_fields.append("status = :status")
            update_data["status"] = attendance_update.status
        
        if not update_fields:
            return current_attendance
        
        update_fields.append("updated_at = NOW()")
        
        query = f"""
            UPDATE attendance 
            SET {', '.join(update_fields)}
            WHERE id = :attendance_id
            RETURNING id, driver_id, date, start_time, end_time, status, created_at, updated_at
        """
        
        result = self.db.execute(text(query), update_data)
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "date": row[2].isoformat() if row[2] else None,
            "start_time": row[3].isoformat() if row[3] else None,
            "end_time": row[4].isoformat() if row[4] else None,
            "status": row[5],
            "created_at": row[6].isoformat() if row[6] else None,
            "updated_at": row[7].isoformat() if row[7] else None
        }
    
    def delete_attendance(self, attendance_id: str) -> bool:
        """Delete attendance using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM attendance WHERE id = :attendance_id"),
            {"attendance_id": attendance_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def start_work(self, driver_id: str) -> bool:
        """Start work session using direct SQL"""
        from datetime import date, datetime
        
        today = date.today()
        
        # Check if already has an active work session today (started but not ended)
        result = self.db.execute(
            text("""
                SELECT id, start_time, end_time FROM attendance 
                WHERE driver_id = :driver_id AND date = :today
            """),
            {"driver_id": driver_id, "today": today}
        )
        existing = result.fetchone()
        
        if existing and existing[1] and not existing[2]:  # Already has active session (started but not ended)
            return False
        
        if existing:
            # Update existing record (restart work after previous session ended)
            self.db.execute(
                text("""
                    UPDATE attendance 
                    SET start_time = NOW(), end_time = NULL, status = 'present', updated_at = NOW()
                    WHERE id = :attendance_id
                """),
                {"attendance_id": existing[0]}
            )
        else:
            # Create new record
            self.db.execute(
                text("""
                    INSERT INTO attendance (driver_id, date, start_time, status, created_at, updated_at)
                    VALUES (:driver_id, :date, NOW(), 'present', NOW(), NOW())
                """),
                {"driver_id": driver_id, "date": today}
            )
        
        self.db.commit()
        return True
    
    def end_work(self, driver_id: str) -> bool:
        """End work session using direct SQL"""
        from datetime import date
        
        today = date.today()
        
        # Check if there's an active work session
        result = self.db.execute(
            text("""
                SELECT id FROM attendance 
                WHERE driver_id = :driver_id AND date = :today AND start_time IS NOT NULL AND end_time IS NULL
            """),
            {"driver_id": driver_id, "today": today}
        )
        attendance = result.fetchone()
        
        if not attendance:
            return False
        
        # Update with end time
        self.db.execute(
            text("""
                UPDATE attendance 
                SET end_time = NOW(), updated_at = NOW()
                WHERE id = :attendance_id
            """),
            {"attendance_id": attendance[0]}
        )
        
        self.db.commit()
        return True