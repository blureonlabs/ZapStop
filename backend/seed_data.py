#!/usr/bin/env python3
"""
ZapStop Database Seeder
Create initial data for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, User, Car, Owner, DriverEarning, DriverExpense, Attendance
from app.models.user import UserRole
from app.models.attendance import AttendanceStatus
from app.models.expenses import ExpenseStatus
from app.services.auth_service import AuthService
from datetime import datetime, timedelta
from decimal import Decimal

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")

def seed_users(db: Session):
    """Create initial users"""
    print("Creating users...")
    
    auth_service = AuthService(db)
    
    # Create admin user
    admin_user = User(
        email="admin@zapstop.com",
        password_hash=auth_service.get_password_hash("admin123"),
        name="Admin User",
        role=UserRole.ADMIN,
        phone="+971501234567"
    )
    db.add(admin_user)
    
    # Create accountant user
    accountant_user = User(
        email="accountant@zapstop.com",
        password_hash=auth_service.get_password_hash("accountant123"),
        name="Accountant User",
        role=UserRole.ACCOUNTANT,
        phone="+971501234568"
    )
    db.add(accountant_user)
    
    # Create driver users
    drivers = [
        ("driver1@zapstop.com", "Driver One", "+971501234569"),
        ("driver2@zapstop.com", "Driver Two", "+971501234570"),
        ("driver3@zapstop.com", "Driver Three", "+971501234571"),
    ]
    
    for email, name, phone in drivers:
        driver = User(
            email=email,
            password_hash=auth_service.get_password_hash("driver123"),
            name=name,
            role=UserRole.DRIVER,
            phone=phone
        )
        db.add(driver)
    
    # Create owner user
    owner_user = User(
        email="owner@zapstop.com",
        password_hash=auth_service.get_password_hash("owner123"),
        name="Owner User",
        role=UserRole.OWNER,
        phone="+971501234572"
    )
    db.add(owner_user)
    
    db.commit()
    print("✅ Users created successfully!")

def seed_cars(db: Session):
    """Create initial cars"""
    print("Creating cars...")
    
    cars_data = [
        ("ABC-123", "Toyota Camry 2023", 7500.00),
        ("XYZ-789", "Honda Accord 2023", 7500.00),
        ("DEF-456", "Nissan Altima 2023", 7500.00),
        ("GHI-101", "Hyundai Elantra 2023", 7500.00),
        ("JKL-202", "Kia Optima 2023", 7500.00),
    ]
    
    for plate_number, model, monthly_due in cars_data:
        car = Car(
            plate_number=plate_number,
            model=model,
            monthly_due=monthly_due
        )
        db.add(car)
    
    db.commit()
    print("✅ Cars created successfully!")

def seed_owners(db: Session):
    """Create initial owners"""
    print("Creating owners...")
    
    owners_data = [
        ("John Smith", "john.smith@example.com", "+971501234580", "123 Main Street, Dubai"),
        ("Sarah Johnson", "sarah.johnson@example.com", "+971501234581", "456 Business Bay, Dubai"),
        ("Ahmed Al-Rashid", "ahmed.rashid@example.com", "+971501234582", "789 Jumeirah, Dubai"),
    ]
    
    for name, email, phone, address in owners_data:
        owner = Owner(
            name=name,
            email=email,
            phone=phone,
            address=address
        )
        db.add(owner)
    
    db.commit()
    print("✅ Owners created successfully!")

def seed_sample_data(db: Session):
    """Create sample earnings and expenses data"""
    print("Creating sample data...")
    
    # Get drivers and cars
    drivers = db.query(User).filter(User.role == UserRole.DRIVER).all()
    cars = db.query(Car).all()
    
    if not drivers or not cars:
        print("⚠️  No drivers or cars found. Skipping sample data creation.")
        return
    
    # Assign cars to drivers
    for i, driver in enumerate(drivers):
        if i < len(cars):
            driver.assigned_car_id = cars[i].id
    
    # Create sample earnings for the last 30 days
    for i in range(30):
        date = datetime.now() - timedelta(days=i)
        
        for driver in drivers:
            earning = DriverEarning(
                driver_id=driver.id,
                date=date,
                uber_cash=Decimal("150.00") + (i * 5),
                uber_account=Decimal("200.00") + (i * 3),
                bolt_cash=Decimal("100.00") + (i * 2),
                bolt_account=Decimal("150.00") + (i * 4),
                uber_rides_count=10 + i,
                bolt_rides_count=8 + i,
                individual_rides_count=5 + i,
                individual_rides_cash=Decimal("80.00") + (i * 2),
                individual_rides_account=Decimal("120.00") + (i * 3),
                notes=f"Sample earning for {date.strftime('%Y-%m-%d')}"
            )
            db.add(earning)
    
    # Create sample expenses
    expense_types = ["fuel", "maintenance", "food", "other"]
    for i in range(15):
        date = datetime.now() - timedelta(days=i*2)
        
        for driver in drivers:
            expense = DriverExpense(
                driver_id=driver.id,
                date=date,
                expense_type=expense_types[i % len(expense_types)],
                amount=Decimal("50.00") + (i * 10),
                description=f"Sample expense for {date.strftime('%Y-%m-%d')}",
                status=ExpenseStatus.APPROVED if i % 3 == 0 else ExpenseStatus.PENDING
            )
            db.add(expense)
    
    # Create sample attendance
    for i in range(7):  # Last 7 days
        date = datetime.now() - timedelta(days=i)
        
        for driver in drivers:
            attendance = Attendance(
                driver_id=driver.id,
                date=date,
                start_time=datetime.combine(date, datetime.min.time().replace(hour=8)),
                end_time=datetime.combine(date, datetime.min.time().replace(hour=17)) if i % 2 == 0 else None,
                status=AttendanceStatus.PRESENT
            )
            db.add(attendance)
    
    db.commit()
    print("✅ Sample data created successfully!")

def main():
    """Main seeder function"""
    print("🌱 Starting ZapStop Database Seeder...")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create tables
        create_tables()
        
        # Seed data
        seed_users(db)
        seed_cars(db)
        seed_owners(db)
        seed_sample_data(db)
        
        print("\n🎉 Database seeding completed successfully!")
        print("\n📋 Created data:")
        print("   - 1 Admin user (admin@zapstop.com / admin123)")
        print("   - 1 Accountant user (accountant@zapstop.com / accountant123)")
        print("   - 3 Driver users (driver1@zapstop.com / driver123)")
        print("   - 1 Owner user (owner@zapstop.com / owner123)")
        print("   - 5 Cars")
        print("   - 3 Owners")
        print("   - Sample earnings, expenses, and attendance data")
        
        print("\n🔗 You can now:")
        print("   1. Start the backend: python run.py")
        print("   2. Open Swagger UI: http://localhost:8000/docs")
        print("   3. Login with admin@zapstop.com / admin123")
        print("   4. Test the API endpoints")
        
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
