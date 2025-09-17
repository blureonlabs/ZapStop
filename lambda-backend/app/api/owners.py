"""
Owners API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.owner import OwnerCreate, OwnerUpdate, OwnerResponse
from app.services.owner_service_simple import OwnerServiceSimple as OwnerService
from app.middleware.auth_simple import get_current_user

router = APIRouter()

@router.get("/", response_model=List[OwnerResponse])
async def get_owners(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all owners (Admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    owner_service = OwnerService(db)
    owners = owner_service.get_owners(skip=skip, limit=limit)
    return owners

@router.get("/{owner_id}", response_model=OwnerResponse)
async def get_owner(
    owner_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get owner by ID (Admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    owner_service = OwnerService(db)
    owner = owner_service.get_owner_by_id(owner_id)
    
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Owner not found"
        )
    
    return owner

@router.post("/", response_model=OwnerResponse)
async def create_owner(
    owner: OwnerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create new owner (Admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    owner_service = OwnerService(db)
    
    # Check if owner already exists
    existing_owner = owner_service.get_owner_by_email(owner.email)
    if existing_owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner with this email already exists"
        )
    
    new_owner = owner_service.create_owner(owner)
    return new_owner

@router.put("/{owner_id}", response_model=OwnerResponse)
async def update_owner(
    owner_id: str,
    owner_update: OwnerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update owner (Admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    owner_service = OwnerService(db)
    owner = owner_service.get_owner_by_id(owner_id)
    
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Owner not found"
        )
    
    updated_owner = owner_service.update_owner(owner_id, owner_update)
    return updated_owner

@router.delete("/{owner_id}")
async def delete_owner(
    owner_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete owner (Admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    owner_service = OwnerService(db)
    owner = owner_service.get_owner_by_id(owner_id)
    
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Owner not found"
        )
    
    owner_service.delete_owner(owner_id)
    return {"message": "Owner deleted successfully"}

@router.get("/{owner_id}/cars", response_model=List[dict])
async def get_owner_cars(
    owner_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get cars owned by specific owner (Admin only)"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    owner_service = OwnerService(db)
    cars = owner_service.get_owner_cars(owner_id)
    return cars
