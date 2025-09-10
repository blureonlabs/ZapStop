"""
Cars API routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.car import CarCreate, CarUpdate, CarResponse
from app.services.car_service import CarService
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/", response_model=List[CarResponse])
async def get_cars(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all cars"""
    car_service = CarService(db)
    cars = car_service.get_cars(skip=skip, limit=limit)
    return cars

@router.get("/{car_id}", response_model=CarResponse)
async def get_car(
    car_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get car by ID"""
    car_service = CarService(db)
    car = car_service.get_car_by_id(car_id)
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    return car

@router.post("/", response_model=CarResponse)
async def create_car(
    car: CarCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new car (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    car_service = CarService(db)
    
    # Check if car already exists
    existing_car = car_service.get_car_by_plate(car.plate_number)
    if existing_car:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Car with this plate number already exists"
        )
    
    new_car = car_service.create_car(car)
    return new_car

@router.put("/{car_id}", response_model=CarResponse)
async def update_car(
    car_id: str,
    car_update: CarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update car (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    car_service = CarService(db)
    car = car_service.get_car_by_id(car_id)
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    updated_car = car_service.update_car(car_id, car_update)
    return updated_car

@router.delete("/{car_id}")
async def delete_car(
    car_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete car (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    car_service = CarService(db)
    car = car_service.get_car_by_id(car_id)
    
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Car not found"
        )
    
    car_service.delete_car(car_id)
    return {"message": "Car deleted successfully"}

@router.post("/{car_id}/assign-driver")
async def assign_driver(
    car_id: str,
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign driver to car (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    car_service = CarService(db)
    result = car_service.assign_driver(car_id, driver_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to assign driver"
        )
    
    return {"message": "Driver assigned successfully"}
