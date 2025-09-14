"""
Simple Car service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.car import CarCreate, CarUpdate

class CarServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_cars(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all cars using direct SQL"""
        result = self.db.execute(
            text("SELECT id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at FROM cars ORDER BY created_at DESC OFFSET :skip LIMIT :limit"),
            {"skip": skip, "limit": limit}
        )
        cars = []
        for row in result:
            cars.append({
                "id": str(row[0]),
                "plate_number": row[1],
                "model": row[2],
                "monthly_due": float(row[3]) if row[3] else None,
                "assigned_driver_id": str(row[4]) if row[4] else None,
                "owner_id": str(row[5]) if row[5] else None,
                "created_at": row[6],
                "updated_at": row[7]
            })
        return cars
    
    def get_car_by_id(self, car_id: str) -> Optional[dict]:
        """Get car by ID using direct SQL"""
        result = self.db.execute(
            text("SELECT id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at FROM cars WHERE id = :car_id"),
            {"car_id": car_id}
        )
        car_row = result.fetchone()
        
        if car_row:
            return {
                "id": str(car_row[0]),
                "plate_number": car_row[1],
                "model": car_row[2],
                "monthly_due": float(car_row[3]) if car_row[3] else None,
                "assigned_driver_id": str(car_row[4]) if car_row[4] else None,
                "owner_id": str(car_row[5]) if car_row[5] else None,
                "created_at": car_row[6],
                "updated_at": car_row[7]
            }
        return None
    
    def get_car_by_driver_id(self, driver_id: str) -> Optional[dict]:
        """Get car assigned to a specific driver using direct SQL"""
        result = self.db.execute(
            text("SELECT id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at FROM cars WHERE assigned_driver_id = :driver_id"),
            {"driver_id": driver_id}
        )
        car_row = result.fetchone()
        
        if car_row:
            return {
                "id": str(car_row[0]),
                "plate_number": car_row[1],
                "model": car_row[2],
                "monthly_due": float(car_row[3]) if car_row[3] else None,
                "assigned_driver_id": str(car_row[4]) if car_row[4] else None,
                "owner_id": str(car_row[5]) if car_row[5] else None,
                "created_at": car_row[6],
                "updated_at": car_row[7]
            }
        return None
    
    def get_car_by_plate(self, plate_number: str) -> Optional[dict]:
        """Get car by plate number using direct SQL"""
        result = self.db.execute(
            text("SELECT id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at FROM cars WHERE plate_number = :plate_number"),
            {"plate_number": plate_number}
        )
        car_row = result.fetchone()
        
        if car_row:
            return {
                "id": str(car_row[0]),
                "plate_number": car_row[1],
                "model": car_row[2],
                "monthly_due": float(car_row[3]) if car_row[3] else None,
                "assigned_driver_id": str(car_row[4]) if car_row[4] else None,
                "owner_id": str(car_row[5]) if car_row[5] else None,
                "created_at": car_row[6],
                "updated_at": car_row[7]
            }
        return None
    
    def create_car(self, car: CarCreate) -> dict:
        """Create new car using direct SQL"""
        result = self.db.execute(
            text("""
                INSERT INTO cars (plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at)
                VALUES (:plate_number, :model, :monthly_due, :assigned_driver_id, :owner_id, NOW(), NOW())
                RETURNING id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at
            """),
            {
                "plate_number": car.plate_number,
                "model": car.model,
                "monthly_due": car.monthly_due,
                "assigned_driver_id": car.assigned_driver_id,
                "owner_id": car.owner_id
            }
        )
        
        car_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(car_row[0]),
            "plate_number": car_row[1],
            "model": car_row[2],
            "monthly_due": float(car_row[3]) if car_row[3] else None,
            "assigned_driver_id": str(car_row[4]) if car_row[4] else None,
            "owner_id": str(car_row[5]) if car_row[5] else None,
            "created_at": car_row[6],
            "updated_at": car_row[7]
        }
    
    def update_car(self, car_id: str, car_update: CarUpdate) -> Optional[dict]:
        """Update car using direct SQL"""
        # Get current car
        current_car = self.get_car_by_id(car_id)
        if not current_car:
            return None
        
        # Get only the fields that were explicitly set (not default None values)
        update_data = car_update.model_dump(exclude_unset=True)
        
        if not update_data:
            return current_car
        
        # Build update query dynamically
        update_fields = []
        query_data = {"car_id": car_id}
        
        for field, value in update_data.items():
            if field == "plate_number":
                update_fields.append("plate_number = :plate_number")
                query_data["plate_number"] = value
            elif field == "model":
                update_fields.append("model = :model")
                query_data["model"] = value
            elif field == "monthly_due":
                update_fields.append("monthly_due = :monthly_due")
                query_data["monthly_due"] = value
            elif field == "assigned_driver_id":
                if value is not None:
                    update_fields.append("assigned_driver_id = :assigned_driver_id")
                    query_data["assigned_driver_id"] = value
                else:
                    update_fields.append("assigned_driver_id = NULL")
            elif field == "owner_id":
                if value is not None:
                    update_fields.append("owner_id = :owner_id")
                    query_data["owner_id"] = value
                else:
                    update_fields.append("owner_id = NULL")
        
        update_fields.append("updated_at = NOW()")
        
        query = f"""
            UPDATE cars 
            SET {', '.join(update_fields)}
            WHERE id = :car_id
            RETURNING id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at
        """
        
        result = self.db.execute(text(query), query_data)
        car_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(car_row[0]),
            "plate_number": car_row[1],
            "model": car_row[2],
            "monthly_due": float(car_row[3]) if car_row[3] else None,
            "assigned_driver_id": str(car_row[4]) if car_row[4] else None,
            "owner_id": str(car_row[5]) if car_row[5] else None,
            "created_at": car_row[6],
            "updated_at": car_row[7]
        }
    
    def delete_car(self, car_id: str) -> bool:
        """Delete car using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM cars WHERE id = :car_id"),
            {"car_id": car_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def assign_driver(self, car_id: str, driver_id: str) -> bool:
        """Assign driver to car using direct SQL"""
        result = self.db.execute(
            text("UPDATE cars SET assigned_driver_id = :driver_id, updated_at = NOW() WHERE id = :car_id"),
            {"car_id": car_id, "driver_id": driver_id}
        )
        self.db.commit()
        return result.rowcount > 0
