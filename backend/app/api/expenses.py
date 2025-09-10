"""
Driver expenses API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.expenses import DriverExpenseCreate, DriverExpenseUpdate, DriverExpenseResponse
from app.services.expenses_service import ExpensesService
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[DriverExpenseResponse])
async def get_expenses(
    driver_id: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get expenses records"""
    expenses_service = ExpensesService(db)
    
    # If driver_id is provided, check permissions
    if driver_id and current_user.role not in ["admin", "accountant"]:
        if current_user.id != driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    expenses = expenses_service.get_expenses(
        driver_id=driver_id or current_user.id,
        status=status,
        skip=skip,
        limit=limit
    )
    return expenses

@router.post("/", response_model=DriverExpenseResponse)
async def create_expense(
    expense: DriverExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new expense record"""
    expenses_service = ExpensesService(db)
    
    # Check permissions
    if current_user.role not in ["admin", "accountant"]:
        if current_user.id != expense.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    new_expense = expenses_service.create_expense(expense)
    return new_expense

@router.put("/{expense_id}", response_model=DriverExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_update: DriverExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update expense record"""
    expenses_service = ExpensesService(db)
    
    # Get existing expense to check permissions
    existing_expense = expenses_service.get_expense_by_id(expense_id)
    if not existing_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "accountant"]:
        if current_user.id != existing_expense.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
    
    updated_expense = expenses_service.update_expense(expense_id, expense_update)
    return updated_expense

@router.put("/{expense_id}/approve")
async def approve_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve expense (Admin/Accountant only)"""
    if current_user.role not in ["admin", "accountant"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    expenses_service = ExpensesService(db)
    result = expenses_service.approve_expense(expense_id, current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to approve expense"
        )
    
    return {"message": "Expense approved successfully"}

@router.put("/{expense_id}/reject")
async def reject_expense(
    expense_id: str,
    admin_notes: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject expense (Admin/Accountant only)"""
    if current_user.role not in ["admin", "accountant"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    expenses_service = ExpensesService(db)
    result = expenses_service.reject_expense(expense_id, current_user.id, admin_notes)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reject expense"
        )
    
    return {"message": "Expense rejected successfully"}
