"""
Analytics service for dashboard data
"""

import pandas as pd
from sqlalchemy.orm import Session
from typing import Dict, List
from datetime import datetime, timedelta
from app.models import DriverEarning, DriverExpense, Car, User

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard_data(self, time_filter: str = "monthly") -> Dict:
        """Get comprehensive dashboard analytics"""
        date_range = self._get_date_range(time_filter)
        
        # Get earnings data
        earnings = self.db.query(DriverEarning).filter(
            DriverEarning.date >= date_range['start'],
            DriverEarning.date <= date_range['end']
        ).all()
        
        # Get expenses data
        expenses = self.db.query(DriverExpense).filter(
            DriverExpense.date >= date_range['start'],
            DriverExpense.date <= date_range['end']
        ).all()
        
        # Get cars and users
        cars = self.db.query(Car).all()
        users = self.db.query(User).all()
        
        # Convert to DataFrame for analysis
        earnings_df = pd.DataFrame([{
            'date': earning.date,
            'driver_id': earning.driver_id,
            'uber_cash': float(earning.uber_cash or 0),
            'uber_account': float(earning.uber_account or 0),
            'bolt_cash': float(earning.bolt_cash or 0),
            'bolt_account': float(earning.bolt_account or 0),
            'individual_cash': float(earning.individual_rides_cash or 0),
            'individual_account': float(earning.individual_rides_account or 0)
        } for earning in earnings])
        
        expenses_df = pd.DataFrame([{
            'date': expense.date,
            'driver_id': expense.driver_id,
            'amount': float(expense.amount or 0),
            'status': expense.status
        } for expense in expenses])
        
        # Calculate metrics
        total_earnings = earnings_df[
            ['uber_cash', 'uber_account', 'bolt_cash', 'bolt_account', 
             'individual_cash', 'individual_account']
        ].sum().sum()
        
        total_expenses = expenses_df[expenses_df['status'] == 'approved']['amount'].sum()
        
        # Platform breakdown
        platform_breakdown = {
            'uber': earnings_df[['uber_cash', 'uber_account']].sum().sum(),
            'bolt': earnings_df[['bolt_cash', 'bolt_account']].sum().sum(),
            'individual': earnings_df[['individual_cash', 'individual_account']].sum().sum()
        }
        
        # Company stats
        total_cars = len(cars)
        total_drivers = len([u for u in users if u.role == 'driver'])
        total_owners = len([u for u in users if u.role == 'owner'])
        
        return {
            'total_earnings': total_earnings,
            'total_expenses': total_expenses,
            'net_profit': total_earnings - total_expenses,
            'platform_breakdown': platform_breakdown,
            'company_stats': {
                'total_cars': total_cars,
                'total_drivers': total_drivers,
                'total_owners': total_owners
            },
            'daily_trends': self._get_daily_trends(earnings_df, expenses_df),
            'car_performance': self._get_car_performance(earnings_df, expenses_df, cars, users)
        }
    
    def get_earnings_analytics(self, time_filter: str = "monthly") -> Dict:
        """Get earnings analytics"""
        date_range = self._get_date_range(time_filter)
        
        earnings = self.db.query(DriverEarning).filter(
            DriverEarning.date >= date_range['start'],
            DriverEarning.date <= date_range['end']
        ).all()
        
        earnings_df = pd.DataFrame([{
            'date': earning.date,
            'driver_id': earning.driver_id,
            'uber_cash': float(earning.uber_cash or 0),
            'uber_account': float(earning.uber_account or 0),
            'bolt_cash': float(earning.bolt_cash or 0),
            'bolt_account': float(earning.bolt_account or 0),
            'individual_cash': float(earning.individual_rides_cash or 0),
            'individual_account': float(earning.individual_rides_account or 0)
        } for earning in earnings])
        
        return {
            'total_earnings': earnings_df[
                ['uber_cash', 'uber_account', 'bolt_cash', 'bolt_account', 
                 'individual_cash', 'individual_account']
            ].sum().sum(),
            'platform_breakdown': {
                'uber': earnings_df[['uber_cash', 'uber_account']].sum().sum(),
                'bolt': earnings_df[['bolt_cash', 'bolt_account']].sum().sum(),
                'individual': earnings_df[['individual_cash', 'individual_account']].sum().sum()
            },
            'daily_trends': self._get_daily_trends(earnings_df, pd.DataFrame())
        }
    
    def get_expenses_analytics(self, time_filter: str = "monthly") -> Dict:
        """Get expenses analytics"""
        date_range = self._get_date_range(time_filter)
        
        expenses = self.db.query(DriverExpense).filter(
            DriverExpense.date >= date_range['start'],
            DriverExpense.date <= date_range['end']
        ).all()
        
        expenses_df = pd.DataFrame([{
            'date': expense.date,
            'driver_id': expense.driver_id,
            'amount': float(expense.amount or 0),
            'expense_type': expense.expense_type,
            'status': expense.status
        } for expense in expenses])
        
        return {
            'total_expenses': expenses_df['amount'].sum(),
            'approved_expenses': expenses_df[expenses_df['status'] == 'approved']['amount'].sum(),
            'pending_expenses': expenses_df[expenses_df['status'] == 'pending']['amount'].sum(),
            'expense_by_type': expenses_df.groupby('expense_type')['amount'].sum().to_dict()
        }
    
    def get_profit_loss_analytics(self, time_filter: str = "monthly") -> Dict:
        """Get profit and loss analytics"""
        earnings_data = self.get_earnings_analytics(time_filter)
        expenses_data = self.get_expenses_analytics(time_filter)
        
        total_earnings = earnings_data['total_earnings']
        total_expenses = expenses_data['approved_expenses']
        net_profit = total_earnings - total_expenses
        
        return {
            'total_earnings': total_earnings,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'profit_margin': (net_profit / total_earnings * 100) if total_earnings > 0 else 0
        }
    
    def _get_date_range(self, time_filter: str) -> Dict[str, datetime]:
        """Get date range based on filter"""
        now = datetime.now()
        if time_filter == "daily":
            start = now - timedelta(days=1)
        elif time_filter == "weekly":
            start = now - timedelta(weeks=1)
        elif time_filter == "monthly":
            start = now - timedelta(days=30)
        elif time_filter == "yearly":
            start = now - timedelta(days=365)
        else:
            start = now - timedelta(days=30)
        
        return {'start': start, 'end': now}
    
    def _get_daily_trends(self, earnings_df: pd.DataFrame, expenses_df: pd.DataFrame) -> List[Dict]:
        """Get daily trends data"""
        if earnings_df.empty:
            return []
        
        # Group by date and sum earnings
        daily_earnings = earnings_df.groupby('date')[
            ['uber_cash', 'uber_account', 'bolt_cash', 'bolt_account', 
             'individual_cash', 'individual_account']
        ].sum().sum(axis=1)
        
        daily_expenses = expenses_df[expenses_df['status'] == 'approved'].groupby('date')['amount'].sum()
        
        # Combine data
        trends = []
        for date in daily_earnings.index:
            trends.append({
                'date': date.strftime('%Y-%m-%d'),
                'earnings': float(daily_earnings[date]),
                'expenses': float(daily_expenses.get(date, 0)),
                'net': float(daily_earnings[date] - daily_expenses.get(date, 0))
            })
        
        return trends
    
    def _get_car_performance(self, earnings_df: pd.DataFrame, expenses_df: pd.DataFrame, cars: List[Car], users: List[User]) -> List[Dict]:
        """Get car performance data"""
        if earnings_df.empty:
            return []
        
        # Create user lookup
        user_lookup = {user.id: user for user in users}
        
        performance = []
        for car in cars:
            # Get earnings for this car's driver
            car_earnings = 0
            car_expenses = 0
            
            if car.assigned_driver_id:
                driver_earnings = earnings_df[earnings_df['driver_id'] == car.assigned_driver_id]
                car_earnings = driver_earnings[
                    ['uber_cash', 'uber_account', 'bolt_cash', 'bolt_account', 
                     'individual_cash', 'individual_account']
                ].sum().sum()
                
                driver_expenses = expenses_df[expenses_df['driver_id'] == car.assigned_driver_id]
                car_expenses = driver_expenses[driver_expenses['status'] == 'approved']['amount'].sum()
            
            performance.append({
                'car_id': str(car.id),
                'plate_number': car.plate_number,
                'model': car.model,
                'monthly_due': float(car.monthly_due),
                'earnings': float(car_earnings),
                'expenses': float(car_expenses),
                'net': float(car_earnings - car_expenses),
                'driver_name': user_lookup.get(car.assigned_driver_id, {}).get('name', 'Unassigned')
            })
        
        return performance
