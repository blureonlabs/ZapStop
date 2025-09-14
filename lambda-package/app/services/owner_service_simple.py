"""
Simple Owner service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.owner import OwnerCreate, OwnerUpdate

class OwnerServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_owners(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all owners using direct SQL"""
        result = self.db.execute(
            text("SELECT id, name, email, phone, address, created_at, updated_at FROM owners ORDER BY created_at DESC OFFSET :skip LIMIT :limit"),
            {"skip": skip, "limit": limit}
        )
        owners = []
        for row in result:
            owners.append({
                "id": str(row[0]),
                "name": row[1],
                "email": row[2],
                "phone": row[3],
                "address": row[4],
                "created_at": row[5],
                "updated_at": row[6]
            })
        return owners
    
    def get_owner_by_id(self, owner_id: str) -> Optional[dict]:
        """Get owner by ID using direct SQL"""
        result = self.db.execute(
            text("SELECT id, name, email, phone, address, created_at, updated_at FROM owners WHERE id = :owner_id"),
            {"owner_id": owner_id}
        )
        owner_row = result.fetchone()
        
        if owner_row:
            return {
                "id": str(owner_row[0]),
                "name": owner_row[1],
                "email": owner_row[2],
                "phone": owner_row[3],
                "address": owner_row[4],
                "created_at": owner_row[5],
                "updated_at": owner_row[6]
            }
        return None
    
    def get_owner_by_email(self, email: str) -> Optional[dict]:
        """Get owner by email using direct SQL"""
        result = self.db.execute(
            text("SELECT id, name, email, phone, address, created_at, updated_at FROM owners WHERE email = :email"),
            {"email": email}
        )
        owner_row = result.fetchone()
        
        if owner_row:
            return {
                "id": str(owner_row[0]),
                "name": owner_row[1],
                "email": owner_row[2],
                "phone": owner_row[3],
                "address": owner_row[4],
                "created_at": owner_row[5],
                "updated_at": owner_row[6]
            }
        return None
    
    def create_owner(self, owner: OwnerCreate) -> dict:
        """Create new owner using direct SQL"""
        result = self.db.execute(
            text("""
                INSERT INTO owners (name, email, phone, address, created_at, updated_at)
                VALUES (:name, :email, :phone, :address, NOW(), NOW())
                RETURNING id, name, email, phone, address, created_at, updated_at
            """),
            {
                "name": owner.name,
                "email": owner.email,
                "phone": owner.phone,
                "address": owner.address
            }
        )
        
        owner_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(owner_row[0]),
            "name": owner_row[1],
            "email": owner_row[2],
            "phone": owner_row[3],
            "address": owner_row[4],
            "created_at": owner_row[5],
            "updated_at": owner_row[6]
        }
    
    def update_owner(self, owner_id: str, owner_update: OwnerUpdate) -> Optional[dict]:
        """Update owner using direct SQL"""
        # Get current owner
        current_owner = self.get_owner_by_id(owner_id)
        if not current_owner:
            return None
        
        # Build update query dynamically
        update_fields = []
        update_data = {"owner_id": owner_id}
        
        if owner_update.name is not None:
            update_fields.append("name = :name")
            update_data["name"] = owner_update.name
        
        if owner_update.email is not None:
            update_fields.append("email = :email")
            update_data["email"] = owner_update.email
        
        if owner_update.phone is not None:
            update_fields.append("phone = :phone")
            update_data["phone"] = owner_update.phone
        
        if owner_update.address is not None:
            update_fields.append("address = :address")
            update_data["address"] = owner_update.address
        
        if not update_fields:
            return current_owner
        
        update_fields.append("updated_at = NOW()")
        
        query = f"""
            UPDATE owners 
            SET {', '.join(update_fields)}
            WHERE id = :owner_id
            RETURNING id, name, email, phone, address, created_at, updated_at
        """
        
        result = self.db.execute(text(query), update_data)
        owner_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(owner_row[0]),
            "name": owner_row[1],
            "email": owner_row[2],
            "phone": owner_row[3],
            "address": owner_row[4],
            "created_at": owner_row[5],
            "updated_at": owner_row[6]
        }
    
    def delete_owner(self, owner_id: str) -> bool:
        """Delete owner using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM owners WHERE id = :owner_id"),
            {"owner_id": owner_id}
        )
        self.db.commit()
        return result.rowcount > 0
    
    def get_owner_cars(self, owner_id: str) -> List[dict]:
        """Get cars owned by specific owner using direct SQL"""
        result = self.db.execute(
            text("""
                SELECT id, plate_number, model, monthly_due, assigned_driver_id, owner_id, created_at, updated_at 
                FROM cars 
                WHERE owner_id = :owner_id 
                ORDER BY created_at DESC
            """),
            {"owner_id": owner_id}
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
