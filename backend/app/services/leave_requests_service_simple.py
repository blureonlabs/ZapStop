"""
Simple Leave Requests service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.leave_requests import LeaveRequestCreate, LeaveRequestUpdate

class LeaveRequestsServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_leave_requests(self, skip: int = 0, limit: int = 100, driver_id: Optional[str] = None) -> List[dict]:
        """Get leave requests using direct SQL"""
        if driver_id:
            result = self.db.execute(
                text("""
                    SELECT 
                        lr.id, lr.driver_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
                        lr.approved_by, lr.created_at, lr.updated_at,
                        u.name as driver_name, u.email as driver_email,
                        approver.name as approver_name, approver.email as approver_email
                    FROM leave_requests lr
                    JOIN users u ON lr.driver_id = u.id
                    LEFT JOIN users approver ON lr.approved_by = approver.id
                    WHERE lr.driver_id = :driver_id
                    ORDER BY lr.created_at DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"driver_id": driver_id, "skip": skip, "limit": limit}
            )
        else:
            result = self.db.execute(
                text("""
                    SELECT 
                        lr.id, lr.driver_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
                        lr.approved_by, lr.created_at, lr.updated_at,
                        u.name as driver_name, u.email as driver_email,
                        approver.name as approver_name, approver.email as approver_email
                    FROM leave_requests lr
                    JOIN users u ON lr.driver_id = u.id
                    LEFT JOIN users approver ON lr.approved_by = approver.id
                    ORDER BY lr.created_at DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"skip": skip, "limit": limit}
            )
        
        leave_requests = []
        for row in result:
            leave_requests.append({
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "leave_type": row[2],
                "start_date": row[3].isoformat() if row[3] else None,
                "end_date": row[4].isoformat() if row[4] else None,
                "reason": row[5],
                "status": row[6],
                "approved_by": str(row[7]) if row[7] else None,
                "approved_at": None,  # Column doesn't exist in database
                "created_at": row[8].isoformat() if row[8] else None,
                "updated_at": row[9].isoformat() if row[9] else None,
                "driver_name": row[10],
                "driver_email": row[11],
                "approver_name": row[12],
                "approver_email": row[13]
            })
        return leave_requests
    
    def get_leave_request_by_id(self, leave_request_id: str) -> Optional[dict]:
        """Get leave request by ID using direct SQL"""
        result = self.db.execute(
            text("""
                SELECT 
                    lr.id, lr.driver_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
                    lr.approved_by, lr.created_at, lr.updated_at,
                    u.name as driver_name, u.email as driver_email,
                    approver.name as approver_name, approver.email as approver_email
                FROM leave_requests lr
                JOIN users u ON lr.driver_id = u.id
                LEFT JOIN users approver ON lr.approved_by = approver.id
                WHERE lr.id = :leave_request_id
            """),
            {"leave_request_id": leave_request_id}
        )
        
        row = result.fetchone()
        if row:
            return {
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "leave_type": row[2],
                "start_date": row[3].isoformat() if row[3] else None,
                "end_date": row[4].isoformat() if row[4] else None,
                "reason": row[5],
                "status": row[6],
                "approved_by": str(row[7]) if row[7] else None,
                "approved_at": None,  # Column doesn't exist in database
                "created_at": row[8].isoformat() if row[8] else None,
                "updated_at": row[9].isoformat() if row[9] else None,
                "driver_name": row[10],
                "driver_email": row[11],
                "approver_name": row[12],
                "approver_email": row[13]
            }
        return None
    
    def create_leave_request(self, leave_request: LeaveRequestCreate) -> dict:
        """Create new leave request using direct SQL"""
        result = self.db.execute(
            text("""
                INSERT INTO leave_requests (
                    driver_id, leave_type, start_date, end_date, reason, status, created_at, updated_at
                )
                VALUES (
                    :driver_id, :leave_type, :start_date, :end_date, :reason, :status, NOW(), NOW()
                )
                RETURNING id, driver_id, leave_type, start_date, end_date, reason, status, approved_by, created_at, updated_at
            """),
            {
                "driver_id": leave_request.driver_id,
                "leave_type": leave_request.leave_type,
                "start_date": leave_request.start_date,
                "end_date": leave_request.end_date,
                "reason": leave_request.reason,
                "status": leave_request.status
            }
        )
        
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "leave_type": row[2],
            "start_date": row[3].isoformat() if row[3] else None,
            "end_date": row[4].isoformat() if row[4] else None,
            "reason": row[5],
            "status": row[6],
            "approved_by": str(row[7]) if row[7] else None,
            "approved_at": None,  # Column doesn't exist in database
            "created_at": row[9].isoformat() if row[9] else None,
            "updated_at": row[10].isoformat() if row[10] else None
        }
    
    def update_leave_request(self, leave_request_id: str, leave_request_update: LeaveRequestUpdate) -> Optional[dict]:
        """Update leave request using direct SQL"""
        # Get current leave request
        current_leave_request = self.get_leave_request_by_id(leave_request_id)
        if not current_leave_request:
            return None
        
        # Build update query dynamically
        update_fields = []
        update_data = {"leave_request_id": leave_request_id}
        
        if leave_request_update.leave_type is not None:
            update_fields.append("leave_type = :leave_type")
            update_data["leave_type"] = leave_request_update.leave_type
        
        if leave_request_update.start_date is not None:
            update_fields.append("start_date = :start_date")
            update_data["start_date"] = leave_request_update.start_date
        
        if leave_request_update.end_date is not None:
            update_fields.append("end_date = :end_date")
            update_data["end_date"] = leave_request_update.end_date
        
        if leave_request_update.reason is not None:
            update_fields.append("reason = :reason")
            update_data["reason"] = leave_request_update.reason
        
        if leave_request_update.status is not None:
            update_fields.append("status = :status")
            update_data["status"] = leave_request_update.status
        
        if leave_request_update.approved_by is not None:
            update_fields.append("approved_by = :approved_by")
            update_data["approved_by"] = leave_request_update.approved_by
        
        if not update_fields:
            return current_leave_request
        
        update_fields.append("updated_at = NOW()")
        
        # Note: approved_at column doesn't exist in the database
        
        query = f"""
            UPDATE leave_requests 
            SET {', '.join(update_fields)}
            WHERE id = :leave_request_id
            RETURNING id, driver_id, leave_type, start_date, end_date, reason, status, approved_by, created_at, updated_at
        """
        
        result = self.db.execute(text(query), update_data)
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "leave_type": row[2],
            "start_date": row[3].isoformat() if row[3] else None,
            "end_date": row[4].isoformat() if row[4] else None,
            "reason": row[5],
            "status": row[6],
            "approved_by": str(row[7]) if row[7] else None,
            "approved_at": None,  # Column doesn't exist in database
            "created_at": row[9].isoformat() if row[9] else None,
            "updated_at": row[10].isoformat() if row[10] else None
        }
    
    def delete_leave_request(self, leave_request_id: str) -> bool:
        """Delete leave request using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM leave_requests WHERE id = :leave_request_id"),
            {"leave_request_id": leave_request_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def approve_leave_request(self, leave_request_id: str, approver_id: str, admin_notes: str = None) -> bool:
        """Approve leave request using direct SQL"""
        result = self.db.execute(
            text("""
                UPDATE leave_requests 
                SET status = 'approved', approved_by = :approver_id, updated_at = NOW()
                WHERE id = :leave_request_id
            """),
            {"leave_request_id": leave_request_id, "approver_id": approver_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def reject_leave_request(self, leave_request_id: str, approver_id: str, admin_notes: str = None) -> bool:
        """Reject leave request using direct SQL"""
        result = self.db.execute(
            text("""
                UPDATE leave_requests 
                SET status = 'rejected', approved_by = :approver_id, updated_at = NOW()
                WHERE id = :leave_request_id
            """),
            {"leave_request_id": leave_request_id, "approver_id": approver_id}
        )
        self.db.commit()
        return result.rowcount > 0
