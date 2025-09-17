"""
Simple User service that works with AuthServiceSimple
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service_simple import AuthServiceSimple

class UserServiceSimple:
    def __init__(self, db: Session):
        self.db = db
        self.auth_service = AuthServiceSimple(db)
    
    def get_users(self, skip: int = 0, limit: int = 100) -> List[dict]:
        """Get all users using direct SQL"""
        result = self.db.execute(
            text("SELECT id, email, name, role, phone, assigned_car_id, created_at, updated_at FROM users ORDER BY created_at DESC OFFSET :skip LIMIT :limit"),
            {"skip": skip, "limit": limit}
        )
        users = []
        for row in result:
            users.append({
                "id": str(row[0]),
                "email": row[1],
                "name": row[2],
                "role": row[3],
                "phone": row[4],
                "assigned_car_id": str(row[5]) if row[5] else None,
                "created_at": row[6],
                "updated_at": row[7]
            })
        return users
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID using direct SQL"""
        result = self.db.execute(
            text("SELECT id, email, name, role, phone, assigned_car_id, created_at, updated_at FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        user_row = result.fetchone()
        
        if user_row:
            return {
                "id": str(user_row[0]),
                "email": user_row[1],
                "name": user_row[2],
                "role": user_row[3],
                "phone": user_row[4],
                "assigned_car_id": str(user_row[5]) if user_row[5] else None,
                "created_at": user_row[6],
                "updated_at": user_row[7]
            }
        return None
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email using direct SQL"""
        result = self.db.execute(
            text("SELECT id, email, name, role, phone, assigned_car_id, created_at, updated_at FROM users WHERE email = :email"),
            {"email": email}
        )
        user_row = result.fetchone()
        
        if user_row:
            return {
                "id": str(user_row[0]),
                "email": user_row[1],
                "name": user_row[2],
                "role": user_row[3],
                "phone": user_row[4],
                "assigned_car_id": str(user_row[5]) if user_row[5] else None,
                "created_at": user_row[6],
                "updated_at": user_row[7]
            }
        return None
    
    def create_user(self, user: UserCreate) -> dict:
        """Create new user using direct SQL"""
        hashed_password = self.auth_service.get_password_hash(user.password)
        
        # Insert user using raw SQL
        result = self.db.execute(
            text("""
                INSERT INTO users (email, password_hash, name, role, phone, assigned_car_id, created_at, updated_at)
                VALUES (:email, :password_hash, :name, :role, :phone, :assigned_car_id, NOW(), NOW())
                RETURNING id, email, name, role, phone, assigned_car_id, created_at, updated_at
            """),
            {
                "email": user.email,
                "password_hash": hashed_password,
                "name": user.name,
                "role": user.role,
                "phone": user.phone,
                "assigned_car_id": getattr(user, 'assigned_car_id', None)
            }
        )
        
        user_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(user_row[0]),
            "email": user_row[1],
            "name": user_row[2],
            "role": user_row[3],
            "phone": user_row[4],
            "assigned_car_id": str(user_row[5]) if user_row[5] else None,
            "created_at": user_row[6],
            "updated_at": user_row[7]
        }
    
    def update_user(self, user_id: str, user_update: UserUpdate) -> Optional[dict]:
        """Update user using direct SQL"""
        # Get current user
        current_user = self.get_user_by_id(user_id)
        if not current_user:
            return None
        
        # Build update query dynamically
        update_fields = []
        update_data = {"user_id": user_id}
        
        if user_update.email is not None:
            update_fields.append("email = :email")
            update_data["email"] = user_update.email
        
        if user_update.name is not None:
            update_fields.append("name = :name")
            update_data["name"] = user_update.name
        
        if user_update.role is not None:
            update_fields.append("role = :role")
            update_data["role"] = user_update.role
        
        if user_update.phone is not None:
            update_fields.append("phone = :phone")
            update_data["phone"] = user_update.phone
        
        if hasattr(user_update, 'assigned_car_id') and user_update.assigned_car_id is not None:
            update_fields.append("assigned_car_id = :assigned_car_id")
            update_data["assigned_car_id"] = user_update.assigned_car_id
        elif hasattr(user_update, 'assigned_car_id') and user_update.assigned_car_id is None:
            update_fields.append("assigned_car_id = NULL")
        
        if not update_fields:
            return current_user
        
        update_fields.append("updated_at = NOW()")
        
        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}
            WHERE id = :user_id
            RETURNING id, email, name, role, phone, assigned_car_id, created_at, updated_at
        """
        
        result = self.db.execute(text(query), update_data)
        user_row = result.fetchone()
        self.db.commit()
        
        return {
            "id": str(user_row[0]),
            "email": user_row[1],
            "name": user_row[2],
            "role": user_row[3],
            "phone": user_row[4],
            "assigned_car_id": str(user_row[5]) if user_row[5] else None,
            "created_at": user_row[6],
            "updated_at": user_row[7]
        }
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user using direct SQL"""
        result = self.db.execute(
            text("DELETE FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        )
        self.db.commit()
        return result.rowcount > 0
