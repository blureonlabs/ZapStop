"""
Earnings service
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.earnings import DriverEarning
from app.schemas.earnings import DriverEarningCreate, DriverEarningUpdate

class EarningsService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_earnings(self, driver_id: str = None, skip: int = 0, limit: int = 100) -> List[DriverEarning]:
        """Get earnings records"""
        query = self.db.query(DriverEarning)
        
        if driver_id:
            query = query.filter(DriverEarning.driver_id == driver_id)
        
        return query.offset(skip).limit(limit).all()
    
    def get_earning_by_id(self, earning_id: str) -> Optional[DriverEarning]:
        """Get earning by ID"""
        return self.db.query(DriverEarning).filter(DriverEarning.id == earning_id).first()
    
    def create_earning(self, earning: DriverEarningCreate) -> DriverEarning:
        """Create new earning"""
        db_earning = DriverEarning(
            driver_id=earning.driver_id,
            date=earning.date,
            uber_cash=earning.uber_cash,
            uber_account=earning.uber_account,
            bolt_cash=earning.bolt_cash,
            bolt_account=earning.bolt_account,
            uber_rides_count=earning.uber_rides_count,
            bolt_rides_count=earning.bolt_rides_count,
            individual_rides_count=earning.individual_rides_count,
            individual_rides_cash=earning.individual_rides_cash,
            individual_rides_account=earning.individual_rides_account,
            notes=earning.notes
        )
        
        self.db.add(db_earning)
        self.db.commit()
        self.db.refresh(db_earning)
        return db_earning
    
    def update_earning(self, earning_id: str, earning_update: DriverEarningUpdate) -> DriverEarning:
        """Update earning"""
        db_earning = self.get_earning_by_id(earning_id)
        if not db_earning:
            return None
        
        update_data = earning_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_earning, field, value)
        
        self.db.commit()
        self.db.refresh(db_earning)
        return db_earning
    
    def delete_earning(self, earning_id: str) -> bool:
        """Delete earning"""
        db_earning = self.get_earning_by_id(earning_id)
        if not db_earning:
            return False
        
        self.db.delete(db_earning)
        self.db.commit()
        return True
