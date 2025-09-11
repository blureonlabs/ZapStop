"""
Simple Analytics service that works with direct SQL
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List
from datetime import datetime, timedelta

class AnalyticsServiceSimple:
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard_data(self, time_filter: str = "monthly") -> Dict[str, Any]:
        """Get dashboard analytics data using direct SQL"""
        # Calculate date range based on filter
        end_date = datetime.now()
        if time_filter == "daily":
            start_date = end_date - timedelta(days=1)
        elif time_filter == "weekly":
            start_date = end_date - timedelta(weeks=1)
        elif time_filter == "monthly":
            start_date = end_date - timedelta(days=30)
        elif time_filter == "yearly":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Get total earnings
        earnings_result = self.db.execute(
            text("""
                SELECT 
                    COALESCE(SUM(uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account), 0) as total_earnings,
                    COALESCE(SUM(uber_cash + uber_account), 0) as uber_earnings,
                    COALESCE(SUM(bolt_cash + bolt_account), 0) as bolt_earnings,
                    COALESCE(SUM(individual_rides_cash + individual_rides_account), 0) as individual_earnings,
                    COUNT(*) as total_earning_records
                FROM driver_earnings 
                WHERE date >= :start_date AND date <= :end_date
            """),
            {"start_date": start_date, "end_date": end_date}
        )
        earnings_data = earnings_result.fetchone()
        
        # Get total expenses
        expenses_result = self.db.execute(
            text("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_expenses,
                    COUNT(*) as total_expense_records
                FROM driver_expenses 
                WHERE date >= :start_date AND date <= :end_date
            """),
            {"start_date": start_date, "end_date": end_date}
        )
        expenses_data = expenses_result.fetchone()
        
        # Get company statistics
        stats_result = self.db.execute(
            text("""
                SELECT 
                    (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
                    (SELECT COUNT(*) FROM cars) as total_cars,
                    (SELECT COUNT(*) FROM owners) as total_owners,
                    (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins
            """)
        )
        stats_data = stats_result.fetchone()
        
        # Get daily trends (last 7 days)
        trends_result = self.db.execute(
            text("""
                SELECT 
                    DATE(date) as trend_date,
                    COALESCE(SUM(uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account), 0) as daily_earnings
                FROM driver_earnings 
                WHERE date >= :start_date AND date <= :end_date
                GROUP BY DATE(date)
                ORDER BY trend_date DESC
                LIMIT 7
            """),
            {"start_date": end_date - timedelta(days=7), "end_date": end_date}
        )
        daily_trends = []
        for row in trends_result:
            daily_trends.append({
                "date": row[0].isoformat() if row[0] else None,
                "earnings": float(row[1]) if row[1] else 0
            })
        
        # Calculate net profit
        total_earnings = float(earnings_data[0]) if earnings_data[0] else 0
        total_expenses = float(expenses_data[0]) if expenses_data[0] else 0
        net_profit = total_earnings - total_expenses
        
        return {
            "summary": {
                "total_earnings": total_earnings,
                "total_expenses": total_expenses,
                "net_profit": net_profit,
                "time_period": time_filter
            },
            "platform_breakdown": {
                "uber_earnings": float(earnings_data[1]) if earnings_data[1] else 0,
                "bolt_earnings": float(earnings_data[2]) if earnings_data[2] else 0,
                "individual_earnings": float(earnings_data[3]) if earnings_data[3] else 0
            },
            "company_stats": {
                "total_drivers": stats_data[0] if stats_data[0] else 0,
                "total_cars": stats_data[1] if stats_data[1] else 0,
                "total_owners": stats_data[2] if stats_data[2] else 0,
                "total_admins": stats_data[3] if stats_data[3] else 0
            },
            "daily_trends": daily_trends,
            "records_count": {
                "earnings_records": earnings_data[4] if earnings_data[4] else 0,
                "expenses_records": expenses_data[1] if expenses_data[1] else 0
            }
        }
    
    def get_earnings_analytics(self, time_filter: str = "monthly") -> Dict[str, Any]:
        """Get earnings analytics using direct SQL"""
        # Calculate date range
        end_date = datetime.now()
        if time_filter == "daily":
            start_date = end_date - timedelta(days=1)
        elif time_filter == "weekly":
            start_date = end_date - timedelta(weeks=1)
        elif time_filter == "monthly":
            start_date = end_date - timedelta(days=30)
        elif time_filter == "yearly":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Get earnings by driver
        driver_earnings_result = self.db.execute(
            text("""
                SELECT 
                    u.name as driver_name,
                    u.email as driver_email,
                    COALESCE(SUM(de.uber_cash + de.uber_account), 0) as uber_earnings,
                    COALESCE(SUM(de.bolt_cash + de.bolt_account), 0) as bolt_earnings,
                    COALESCE(SUM(de.individual_rides_cash + de.individual_rides_account), 0) as individual_earnings,
                    COALESCE(SUM(de.uber_cash + de.uber_account + de.bolt_cash + de.bolt_account + de.individual_rides_cash + de.individual_rides_account), 0) as total_earnings,
                    COUNT(de.id) as total_rides
                FROM users u
                LEFT JOIN driver_earnings de ON u.id = de.driver_id AND de.date >= :start_date AND de.date <= :end_date
                WHERE u.role = 'driver'
                GROUP BY u.id, u.name, u.email
                ORDER BY total_earnings DESC
            """),
            {"start_date": start_date, "end_date": end_date}
        )
        
        driver_earnings = []
        for row in driver_earnings_result:
            driver_earnings.append({
                "driver_name": row[0],
                "driver_email": row[1],
                "uber_earnings": float(row[2]) if row[2] else 0,
                "bolt_earnings": float(row[3]) if row[3] else 0,
                "individual_earnings": float(row[4]) if row[4] else 0,
                "total_earnings": float(row[5]) if row[5] else 0,
                "total_rides": row[6] if row[6] else 0
            })
        
        return {
            "time_period": time_filter,
            "driver_earnings": driver_earnings,
            "summary": {
                "total_drivers": len(driver_earnings),
                "total_earnings": sum(driver["total_earnings"] for driver in driver_earnings),
                "average_earnings": sum(driver["total_earnings"] for driver in driver_earnings) / len(driver_earnings) if driver_earnings else 0
            }
        }
