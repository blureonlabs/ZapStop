"""
Simple Earnings service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.earnings import DriverEarningCreate, DriverEarningUpdate
from datetime import datetime

class EarningsServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_earnings(self, skip: int = 0, limit: int = 100, driver_id: Optional[str] = None) -> List[dict]:
        """Get earnings using direct SQL"""
        if driver_id:
            result = self.db.execute(
                text("""
                    SELECT 
                        de.id, de.driver_id, de.date, de.uber_cash, de.uber_account, de.bolt_cash, de.bolt_account,
                        de.uber_rides_count, de.bolt_rides_count, de.individual_rides_count,
                        de.individual_rides_cash, de.individual_rides_account, de.notes, de.created_at, de.updated_at,
                        u.name as driver_name, u.email as driver_email
                    FROM driver_earnings de
                    JOIN users u ON de.driver_id = u.id
                    WHERE de.driver_id = :driver_id
                    ORDER BY de.date DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"driver_id": driver_id, "skip": skip, "limit": limit}
            )
        else:
            result = self.db.execute(
                text("""
                    SELECT 
                        de.id, de.driver_id, de.date, de.uber_cash, de.uber_account, de.bolt_cash, de.bolt_account,
                        de.uber_rides_count, de.bolt_rides_count, de.individual_rides_count,
                        de.individual_rides_cash, de.individual_rides_account, de.notes, de.created_at, de.updated_at,
                        u.name as driver_name, u.email as driver_email
                    FROM driver_earnings de
                    JOIN users u ON de.driver_id = u.id
                    ORDER BY de.date DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"skip": skip, "limit": limit}
            )
        
        earnings = []
        for row in result:
            earnings.append({
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "date": row[2].isoformat() if row[2] else None,
                "uber_cash": float(row[3]) if row[3] else 0,
                "uber_account": float(row[4]) if row[4] else 0,
                "bolt_cash": float(row[5]) if row[5] else 0,
                "bolt_account": float(row[6]) if row[6] else 0,
                "uber_rides_count": row[7] if row[7] else 0,
                "bolt_rides_count": row[8] if row[8] else 0,
                "individual_rides_count": row[9] if row[9] else 0,
                "individual_rides_cash": float(row[10]) if row[10] else 0,
                "individual_rides_account": float(row[11]) if row[11] else 0,
                "notes": row[12],
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
                "driver_name": row[15],
                "driver_email": row[16]
            })
        return earnings
    
    def get_earning_by_id(self, earning_id: str) -> Optional[dict]:
        """Get earning by ID using direct SQL"""
        result = self.db.execute(
            text("""
                SELECT 
                    de.id, de.driver_id, de.date, de.uber_cash, de.uber_account, de.bolt_cash, de.bolt_account,
                    de.uber_rides_count, de.bolt_rides_count, de.individual_rides_count,
                    de.individual_rides_cash, de.individual_rides_account, de.notes, de.created_at, de.updated_at,
                    u.name as driver_name, u.email as driver_email
                FROM driver_earnings de
                JOIN users u ON de.driver_id = u.id
                WHERE de.id = :earning_id
            """),
            {"earning_id": earning_id}
        )
        
        row = result.fetchone()
        if row:
            return {
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "date": row[2].isoformat() if row[2] else None,
                "uber_cash": float(row[3]) if row[3] else 0,
                "uber_account": float(row[4]) if row[4] else 0,
                "bolt_cash": float(row[5]) if row[5] else 0,
                "bolt_account": float(row[6]) if row[6] else 0,
                "uber_rides_count": row[7] if row[7] else 0,
                "bolt_rides_count": row[8] if row[8] else 0,
                "individual_rides_count": row[9] if row[9] else 0,
                "individual_rides_cash": float(row[10]) if row[10] else 0,
                "individual_rides_account": float(row[11]) if row[11] else 0,
                "notes": row[12],
                "created_at": row[13].isoformat() if row[13] else None,
                "updated_at": row[14].isoformat() if row[14] else None,
                "driver_name": row[15],
                "driver_email": row[16]
            }
        return None
    
    def create_earning(self, earning: DriverEarningCreate) -> dict:
        """Create new earning using direct SQL"""
        result = self.db.execute(
            text("""
                INSERT INTO driver_earnings (
                    driver_id, date, uber_cash, uber_account, bolt_cash, bolt_account,
                    uber_rides_count, bolt_rides_count, individual_rides_count,
                    individual_rides_cash, individual_rides_account, notes, created_at, updated_at
                )
                VALUES (
                    :driver_id, :date, :uber_cash, :uber_account, :bolt_cash, :bolt_account,
                    :uber_rides_count, :bolt_rides_count, :individual_rides_count,
                    :individual_rides_cash, :individual_rides_account, :notes, NOW(), NOW()
                )
                RETURNING id, driver_id, date, uber_cash, uber_account, bolt_cash, bolt_account,
                    uber_rides_count, bolt_rides_count, individual_rides_count,
                    individual_rides_cash, individual_rides_account, notes, created_at, updated_at
            """),
            {
                "driver_id": earning.driver_id,
                "date": earning.date,
                "uber_cash": earning.uber_cash,
                "uber_account": earning.uber_account,
                "bolt_cash": earning.bolt_cash,
                "bolt_account": earning.bolt_account,
                "uber_rides_count": earning.uber_rides_count,
                "bolt_rides_count": earning.bolt_rides_count,
                "individual_rides_count": earning.individual_rides_count,
                "individual_rides_cash": earning.individual_rides_cash,
                "individual_rides_account": earning.individual_rides_account,
                "notes": earning.notes
            }
        )
        
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "date": row[2].isoformat() if row[2] else None,
            "uber_cash": float(row[3]) if row[3] else 0,
            "uber_account": float(row[4]) if row[4] else 0,
            "bolt_cash": float(row[5]) if row[5] else 0,
            "bolt_account": float(row[6]) if row[6] else 0,
            "uber_rides_count": row[7] if row[7] else 0,
            "bolt_rides_count": row[8] if row[8] else 0,
            "individual_rides_count": row[9] if row[9] else 0,
            "individual_rides_cash": float(row[10]) if row[10] else 0,
            "individual_rides_account": float(row[11]) if row[11] else 0,
            "notes": row[12],
            "created_at": row[13].isoformat() if row[13] else None,
            "updated_at": row[14].isoformat() if row[14] else None
        }
    
    def update_earning(self, earning_id: str, earning_update: DriverEarningUpdate) -> Optional[dict]:
        """Update earning using direct SQL"""
        # Get current earning
        current_earning = self.get_earning_by_id(earning_id)
        if not current_earning:
            return None
        
        # Build update query dynamically
        update_fields = []
        update_data = {"earning_id": earning_id}
        
        if earning_update.date is not None:
            update_fields.append("date = :date")
            update_data["date"] = earning_update.date
        
        if earning_update.uber_cash is not None:
            update_fields.append("uber_cash = :uber_cash")
            update_data["uber_cash"] = earning_update.uber_cash
        
        if earning_update.uber_account is not None:
            update_fields.append("uber_account = :uber_account")
            update_data["uber_account"] = earning_update.uber_account
        
        if earning_update.bolt_cash is not None:
            update_fields.append("bolt_cash = :bolt_cash")
            update_data["bolt_cash"] = earning_update.bolt_cash
        
        if earning_update.bolt_account is not None:
            update_fields.append("bolt_account = :bolt_account")
            update_data["bolt_account"] = earning_update.bolt_account
        
        if earning_update.uber_rides_count is not None:
            update_fields.append("uber_rides_count = :uber_rides_count")
            update_data["uber_rides_count"] = earning_update.uber_rides_count
        
        if earning_update.bolt_rides_count is not None:
            update_fields.append("bolt_rides_count = :bolt_rides_count")
            update_data["bolt_rides_count"] = earning_update.bolt_rides_count
        
        if earning_update.individual_rides_count is not None:
            update_fields.append("individual_rides_count = :individual_rides_count")
            update_data["individual_rides_count"] = earning_update.individual_rides_count
        
        if earning_update.individual_rides_cash is not None:
            update_fields.append("individual_rides_cash = :individual_rides_cash")
            update_data["individual_rides_cash"] = earning_update.individual_rides_cash
        
        if earning_update.individual_rides_account is not None:
            update_fields.append("individual_rides_account = :individual_rides_account")
            update_data["individual_rides_account"] = earning_update.individual_rides_account
        
        if earning_update.notes is not None:
            update_fields.append("notes = :notes")
            update_data["notes"] = earning_update.notes
        
        if not update_fields:
            return current_earning
        
        update_fields.append("updated_at = NOW()")
        
        query = f"""
            UPDATE driver_earnings 
            SET {', '.join(update_fields)}
            WHERE id = :earning_id
            RETURNING id, driver_id, date, uber_cash, uber_account, bolt_cash, bolt_account,
                uber_rides_count, bolt_rides_count, individual_rides_count,
                individual_rides_cash, individual_rides_account, notes, created_at, updated_at
        """
        
        result = self.db.execute(text(query), update_data)
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "date": row[2].isoformat() if row[2] else None,
            "uber_cash": float(row[3]) if row[3] else 0,
            "uber_account": float(row[4]) if row[4] else 0,
            "bolt_cash": float(row[5]) if row[5] else 0,
            "bolt_account": float(row[6]) if row[6] else 0,
            "uber_rides_count": row[7] if row[7] else 0,
            "bolt_rides_count": row[8] if row[8] else 0,
            "individual_rides_count": row[9] if row[9] else 0,
            "individual_rides_cash": float(row[10]) if row[10] else 0,
            "individual_rides_account": float(row[11]) if row[11] else 0,
            "notes": row[12],
            "created_at": row[13].isoformat() if row[13] else None,
            "updated_at": row[14].isoformat() if row[14] else None
        }
    
    def delete_earning(self, earning_id: str) -> bool:
        """Delete earning using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM driver_earnings WHERE id = :earning_id"),
            {"earning_id": earning_id}
        )
        self.db.commit()
        return result.rowcount > 0
