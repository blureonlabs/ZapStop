"""
Expenses service
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.expenses import DriverExpense, ExpenseStatus
from app.schemas.expenses import DriverExpenseCreate, DriverExpenseUpdate

class ExpensesService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_expenses(self, driver_id: str = None, status: str = None, skip: int = 0, limit: int = 100) -> List[DriverExpense]:
        """Get expenses records"""
        query = self.db.query(DriverExpense)
        
        if driver_id:
            query = query.filter(DriverExpense.driver_id == driver_id)
        
        if status:
            query = query.filter(DriverExpense.status == status)
        
        return query.offset(skip).limit(limit).all()
    
    def get_expense_by_id(self, expense_id: str) -> Optional[DriverExpense]:
        """Get expense by ID"""
        return self.db.query(DriverExpense).filter(DriverExpense.id == expense_id).first()
    
    def create_expense(self, expense: DriverExpenseCreate) -> DriverExpense:
        """Create new expense"""
        db_expense = DriverExpense(
            driver_id=expense.driver_id,
            date=expense.date,
            expense_type=expense.expense_type,
            amount=expense.amount,
            description=expense.description,
            proof_url=expense.proof_url
        )
        
        self.db.add(db_expense)
        self.db.commit()
        self.db.refresh(db_expense)
        return db_expense
    
    def update_expense(self, expense_id: str, expense_update: DriverExpenseUpdate) -> DriverExpense:
        """Update expense"""
        db_expense = self.get_expense_by_id(expense_id)
        if not db_expense:
            return None
        
        update_data = expense_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_expense, field, value)
        
        self.db.commit()
        self.db.refresh(db_expense)
        return db_expense
    
    def approve_expense(self, expense_id: str, approved_by: str) -> bool:
        """Approve expense"""
        db_expense = self.get_expense_by_id(expense_id)
        if not db_expense:
            return False
        
        db_expense.status = ExpenseStatus.APPROVED
        self.db.commit()
        return True
    
    def reject_expense(self, expense_id: str, approved_by: str, admin_notes: str = None) -> bool:
        """Reject expense"""
        db_expense = self.get_expense_by_id(expense_id)
        if not db_expense:
            return False
        
        db_expense.status = ExpenseStatus.REJECTED
        if admin_notes:
            db_expense.description = f"{db_expense.description}\n\nAdmin Notes: {admin_notes}"
        
        self.db.commit()
        return True
