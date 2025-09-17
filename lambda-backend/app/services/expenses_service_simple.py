"""
Simple Expenses service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.expenses import DriverExpenseCreate, DriverExpenseUpdate

class ExpensesServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_expenses(self, skip: int = 0, limit: int = 100, driver_id: Optional[str] = None) -> List[dict]:
        """Get expenses using direct SQL"""
        if driver_id:
            result = self.db.execute(
                text("""
                    SELECT 
                        de.id, de.driver_id, de.date, de.expense_type, de.amount, de.description, de.status,
                        de.created_at, de.updated_at, u.name as driver_name, u.email as driver_email
                    FROM driver_expenses de
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
                        de.id, de.driver_id, de.date, de.expense_type, de.amount, de.description, de.status,
                        de.created_at, de.updated_at, u.name as driver_name, u.email as driver_email
                    FROM driver_expenses de
                    JOIN users u ON de.driver_id = u.id
                    ORDER BY de.date DESC
                    OFFSET :skip LIMIT :limit
                """),
                {"skip": skip, "limit": limit}
            )
        
        expenses = []
        for row in result:
            expenses.append({
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "date": row[2].isoformat() if row[2] else None,
                "expense_type": row[3],
                "amount": float(row[4]) if row[4] else 0,
                "description": row[5],
                "status": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "updated_at": row[8].isoformat() if row[8] else None,
                "driver_name": row[9],
                "driver_email": row[10]
            })
        return expenses
    
    def get_expense_by_id(self, expense_id: str) -> Optional[dict]:
        """Get expense by ID using direct SQL"""
        result = self.db.execute(
            text("""
                SELECT 
                    de.id, de.driver_id, de.date, de.expense_type, de.amount, de.description, de.status,
                    de.created_at, de.updated_at, u.name as driver_name, u.email as driver_email
                FROM driver_expenses de
                JOIN users u ON de.driver_id = u.id
                WHERE de.id = :expense_id
            """),
            {"expense_id": expense_id}
        )
        
        row = result.fetchone()
        if row:
            return {
                "id": str(row[0]),
                "driver_id": str(row[1]),
                "date": row[2].isoformat() if row[2] else None,
                "expense_type": row[3],
                "amount": float(row[4]) if row[4] else 0,
                "description": row[5],
                "status": row[6],
                "created_at": row[7].isoformat() if row[7] else None,
                "updated_at": row[8].isoformat() if row[8] else None,
                "driver_name": row[9],
                "driver_email": row[10]
            }
        return None
    
    def create_expense(self, expense: DriverExpenseCreate) -> dict:
        """Create new expense using direct SQL"""
        result = self.db.execute(
            text("""
                INSERT INTO driver_expenses (
                    driver_id, date, expense_type, amount, description, status, created_at, updated_at
                )
                VALUES (
                    :driver_id, :date, :expense_type, :amount, :description, :status, NOW(), NOW()
                )
                RETURNING id, driver_id, date, expense_type, amount, description, status, created_at, updated_at
            """),
            {
                "driver_id": expense.driver_id,
                "date": expense.date,
                "expense_type": expense.expense_type,
                "amount": expense.amount,
                "description": expense.description,
                "status": expense.status
            }
        )
        
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "date": row[2].isoformat() if row[2] else None,
            "expense_type": row[3],
            "amount": float(row[4]) if row[4] else 0,
            "description": row[5],
            "status": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
            "updated_at": row[8].isoformat() if row[8] else None
        }
    
    def update_expense(self, expense_id: str, expense_update: DriverExpenseUpdate) -> Optional[dict]:
        """Update expense using direct SQL"""
        # Get current expense
        current_expense = self.get_expense_by_id(expense_id)
        if not current_expense:
            return None
        
        # Build update query dynamically
        update_fields = []
        update_data = {"expense_id": expense_id}
        
        if expense_update.date is not None:
            update_fields.append("date = :date")
            update_data["date"] = expense_update.date
        
        if expense_update.expense_type is not None:
            update_fields.append("expense_type = :expense_type")
            update_data["expense_type"] = expense_update.expense_type
        
        if expense_update.amount is not None:
            update_fields.append("amount = :amount")
            update_data["amount"] = expense_update.amount
        
        if expense_update.description is not None:
            update_fields.append("description = :description")
            update_data["description"] = expense_update.description
        
        if expense_update.status is not None:
            update_fields.append("status = :status")
            update_data["status"] = expense_update.status
        
        if not update_fields:
            return current_expense
        
        update_fields.append("updated_at = NOW()")
        
        query = f"""
            UPDATE driver_expenses 
            SET {', '.join(update_fields)}
            WHERE id = :expense_id
            RETURNING id, driver_id, date, expense_type, amount, description, status, created_at, updated_at
        """
        
        result = self.db.execute(text(query), update_data)
        row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(row[0]),
            "driver_id": str(row[1]),
            "date": row[2].isoformat() if row[2] else None,
            "expense_type": row[3],
            "amount": float(row[4]) if row[4] else 0,
            "description": row[5],
            "status": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
            "updated_at": row[8].isoformat() if row[8] else None
        }
    
    def delete_expense(self, expense_id: str) -> bool:
        """Delete expense using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM driver_expenses WHERE id = :expense_id"),
            {"expense_id": expense_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def approve_expense(self, expense_id: str, approver_id: str) -> bool:
        """Approve expense using direct SQL"""
        result = self.db.execute(
            text("""
                UPDATE driver_expenses 
                SET status = 'approved', updated_at = NOW()
                WHERE id = :expense_id
            """),
            {"expense_id": expense_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def reject_expense(self, expense_id: str, approver_id: str, admin_notes: str = None) -> bool:
        """Reject expense using direct SQL"""
        result = self.db.execute(
            text("""
                UPDATE driver_expenses 
                SET status = 'rejected', updated_at = NOW()
                WHERE id = :expense_id
            """),
            {"expense_id": expense_id}
        )
        self.db.commit()
        return result.rowcount > 0
