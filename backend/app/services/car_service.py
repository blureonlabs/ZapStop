"""
Car service
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.car import Car
from app.schemas.car import CarCreate, CarUpdate

class CarService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_cars(self, skip: int = 0, limit: int = 100) -> List[Car]:
        """Get all cars"""
        return self.db.query(Car).offset(skip).limit(limit).all()
    
    def get_car_by_id(self, car_id: str) -> Optional[Car]:
        """Get car by ID"""
        return self.db.query(Car).filter(Car.id == car_id).first()
    
    def get_car_by_plate(self, plate_number: str) -> Optional[Car]:
        """Get car by plate number"""
        return self.db.query(Car).filter(Car.plate_number == plate_number).first()
    
    def create_car(self, car: CarCreate) -> Car:
        """Create new car"""
        db_car = Car(
            plate_number=car.plate_number,
            model=car.model,
            monthly_due=car.monthly_due,
            assigned_driver_id=car.assigned_driver_id,
            owner_id=car.owner_id
        )
        
        self.db.add(db_car)
        self.db.commit()
        self.db.refresh(db_car)
        return db_car
    
    def update_car(self, car_id: str, car_update: CarUpdate) -> Car:
        """Update car"""
        db_car = self.get_car_by_id(car_id)
        if not db_car:
            return None
        
        update_data = car_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_car, field, value)
        
        self.db.commit()
        self.db.refresh(db_car)
        return db_car
    
    def delete_car(self, car_id: str) -> bool:
        """Delete car"""
        db_car = self.get_car_by_id(car_id)
        if not db_car:
            return False
        
        self.db.delete(db_car)
        self.db.commit()
        return True
    
    def assign_driver(self, car_id: str, driver_id: str) -> bool:
        """Assign driver to car"""
        db_car = self.get_car_by_id(car_id)
        if not db_car:
            return False
        
        db_car.assigned_driver_id = driver_id
        self.db.commit()
        return True
