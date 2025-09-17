"""
Optimized Analytics service with better performance
"""

from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class AnalyticsServiceOptimized:
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard_data(self, time_filter: str = "monthly") -> Dict[str, Any]:
        """Get dashboard analytics data using optimized single query"""
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
        
        # Single optimized query instead of multiple queries
        try:
            result = self.db.execute(
                text("""
                    WITH earnings_summary AS (
                        SELECT 
                            COALESCE(SUM(uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account), 0) as total_earnings,
                            COALESCE(SUM(uber_cash + uber_account), 0) as uber_earnings,
                            COALESCE(SUM(bolt_cash + bolt_account), 0) as bolt_earnings,
                            COALESCE(SUM(individual_rides_cash + individual_rides_account), 0) as individual_earnings,
                            COUNT(*) as total_earning_records
                        FROM driver_earnings 
                        WHERE date >= :start_date AND date <= :end_date
                    ),
                    expenses_summary AS (
                        SELECT 
                            COALESCE(SUM(amount), 0) as total_expenses,
                            COUNT(*) as total_expense_records
                        FROM driver_expenses 
                        WHERE date >= :start_date AND date <= :end_date
                    ),
                    company_stats AS (
                        SELECT 
                            (SELECT COUNT(*) FROM users WHERE role = 'driver') as total_drivers,
                            (SELECT COUNT(*) FROM cars) as total_cars,
                            (SELECT COUNT(*) FROM owners) as total_owners,
                            (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins
                    ),
                    active_drivers_count AS (
                        SELECT COUNT(*) as active_count
                        FROM users u
                        JOIN attendance a ON u.id = a.driver_id
                        WHERE u.role = 'driver' 
                        AND a.date = CURRENT_DATE 
                        AND a.start_time IS NOT NULL 
                        AND a.end_time IS NULL
                    ),
                    daily_trends AS (
                        SELECT 
                            DATE(date) as trend_date,
                            COALESCE(SUM(uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account), 0) as daily_earnings
                        FROM driver_earnings 
                        WHERE date >= :trend_start_date AND date <= :end_date
                        GROUP BY DATE(date)
                        ORDER BY trend_date DESC
                        LIMIT 7
                    )
                    SELECT 
                        e.total_earnings,
                        e.uber_earnings,
                        e.bolt_earnings,
                        e.individual_earnings,
                        e.total_earning_records,
                        ex.total_expenses,
                        ex.total_expense_records,
                        cs.total_drivers,
                        cs.total_cars,
                        cs.total_owners,
                        cs.total_admins,
                        ad.active_count,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'date', dt.trend_date,
                                    'earnings', dt.daily_earnings
                                )
                            ) FILTER (WHERE dt.trend_date IS NOT NULL),
                            '[]'::json
                        ) as trends
                    FROM earnings_summary e, expenses_summary ex, company_stats cs, active_drivers_count ad
                    LEFT JOIN daily_trends dt ON true
                    GROUP BY e.total_earnings, e.uber_earnings, e.bolt_earnings, e.individual_earnings, 
                             e.total_earning_records, ex.total_expenses, ex.total_expense_records,
                             cs.total_drivers, cs.total_cars, cs.total_owners, cs.total_admins, ad.active_count
                """),
                {
                    "start_date": start_date, 
                    "end_date": end_date,
                    "trend_start_date": end_date - timedelta(days=7)
                }
            )
            
            row = result.fetchone()
            if not row:
                return self._get_empty_dashboard_data(time_filter)
            
            # Calculate net profit
            total_earnings = float(row[0]) if row[0] else 0
            total_expenses = float(row[5]) if row[5] else 0
            net_profit = total_earnings - total_expenses
            
            # Parse trends
            trends = row[12] if row[12] else []
            if isinstance(trends, str):
                import json
                trends = json.loads(trends)
            
            return {
                "summary": {
                    "total_earnings": total_earnings,
                    "total_expenses": total_expenses,
                    "net_profit": net_profit,
                    "time_period": time_filter
                },
                "platform_breakdown": {
                    "uber_earnings": float(row[1]) if row[1] else 0,
                    "bolt_earnings": float(row[2]) if row[2] else 0,
                    "individual_earnings": float(row[3]) if row[3] else 0
                },
                "company_stats": {
                    "total_drivers": row[7] if row[7] else 0,
                    "active_drivers": row[11] if row[11] else 0,
                    "total_cars": row[8] if row[8] else 0,
                    "total_owners": row[9] if row[9] else 0,
                    "total_admins": row[10] if row[10] else 0
                },
                "active_drivers": [],  # Will be populated separately if needed
                "daily_trends": trends,
                "records_count": {
                    "earnings_records": row[4] if row[4] else 0,
                    "expenses_records": row[6] if row[6] else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in get_dashboard_data: {e}")
            return self._get_empty_dashboard_data(time_filter)
    
    def get_active_drivers(self) -> List[Dict[str, Any]]:
        """Get list of currently active drivers with optimized query"""
        try:
            result = self.db.execute(
                text("""
                    SELECT 
                        u.id, u.name, u.email, u.phone,
                        a.start_time, a.date,
                        c.plate_number, c.model,
                        c.monthly_due
                    FROM users u
                    JOIN attendance a ON u.id = a.driver_id
                    LEFT JOIN cars c ON u.id = c.assigned_driver_id
                    WHERE u.role = 'driver' 
                    AND a.date = CURRENT_DATE 
                    AND a.start_time IS NOT NULL 
                    AND a.end_time IS NULL
                    ORDER BY a.start_time DESC
                """)
            )
            
            active_drivers = []
            for row in result:
                active_drivers.append({
                    "id": str(row[0]),
                    "name": row[1],
                    "email": row[2],
                    "phone": row[3],
                    "start_time": row[4].isoformat() if row[4] else None,
                    "date": row[5].isoformat() if row[5] else None,
                    "car_plate": row[6],
                    "car_model": row[7],
                    "monthly_due": float(row[8]) if row[8] else 0
                })
            
            return active_drivers
            
        except Exception as e:
            logger.error(f"Error in get_active_drivers: {e}")
            return []
    
    def get_earnings_analytics(self, time_filter: str = "monthly") -> Dict[str, Any]:
        """Get earnings analytics with optimized query"""
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
        
        try:
            result = self.db.execute(
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
            for row in result:
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
            
        except Exception as e:
            logger.error(f"Error in get_earnings_analytics: {e}")
            return {
                "time_period": time_filter,
                "driver_earnings": [],
                "summary": {
                    "total_drivers": 0,
                    "total_earnings": 0,
                    "average_earnings": 0
                }
            }
    
    def _get_empty_dashboard_data(self, time_filter: str) -> Dict[str, Any]:
        """Return empty dashboard data structure"""
        return {
            "summary": {
                "total_earnings": 0,
                "total_expenses": 0,
                "net_profit": 0,
                "time_period": time_filter
            },
            "platform_breakdown": {
                "uber_earnings": 0,
                "bolt_earnings": 0,
                "individual_earnings": 0
            },
            "company_stats": {
                "total_drivers": 0,
                "active_drivers": 0,
                "total_cars": 0,
                "total_owners": 0,
                "total_admins": 0
            },
            "active_drivers": [],
            "daily_trends": [],
            "records_count": {
                "earnings_records": 0,
                "expenses_records": 0
            }
        }
