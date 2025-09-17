-- Database Performance Optimization for ZapStop
-- Run these queries to improve performance immediately

-- 1. Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_driver_earnings_date ON driver_earnings(date);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_date ON driver_earnings(driver_id, date);

CREATE INDEX IF NOT EXISTS idx_driver_expenses_date ON driver_expenses(date);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_driver_id ON driver_expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_status ON driver_expenses(status);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_driver_status ON driver_expenses(driver_id, status);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_driver_id ON attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_attendance_driver_date ON attendance(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_start_time ON attendance(start_time);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_cars_assigned_driver ON cars(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);

-- 2. Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_earnings_platform_date ON driver_earnings(date, uber_cash, uber_account, bolt_cash, bolt_account, individual_rides_cash, individual_rides_account);

-- 3. Analyze tables to update statistics
ANALYZE driver_earnings;
ANALYZE driver_expenses;
ANALYZE attendance;
ANALYZE users;
ANALYZE cars;

-- 4. Create materialized view for dashboard data (optional - for very large datasets)
-- This will pre-calculate dashboard data and refresh periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_summary AS
SELECT 
    DATE_TRUNC('day', date) as summary_date,
    SUM(uber_cash + uber_account + bolt_cash + bolt_account + individual_rides_cash + individual_rides_account) as total_earnings,
    SUM(uber_cash + uber_account) as uber_earnings,
    SUM(bolt_cash + bolt_account) as bolt_earnings,
    SUM(individual_rides_cash + individual_rides_account) as individual_earnings,
    COUNT(*) as total_records
FROM driver_earnings 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', date)
ORDER BY summary_date DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_dashboard_summary_date ON dashboard_summary(summary_date);

-- 5. Optimize database settings for better performance
-- These settings should be applied to your Neon database
-- (Note: Some settings might require superuser privileges)

-- Increase work_mem for complex queries
-- SET work_mem = '64MB';

-- Increase shared_buffers (if possible)
-- SET shared_buffers = '256MB';

-- Enable query plan caching
-- SET plan_cache_mode = 'force_custom_plan';

-- 6. Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_dashboard_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW dashboard_summary;
END;
$$ LANGUAGE plpgsql;

-- 7. Query optimization examples
-- Instead of multiple separate queries, use these optimized versions:

-- Optimized dashboard query (replace the complex one in analytics_service_simple.py)
-- This single query replaces multiple queries in get_dashboard_data()
/*
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
)
SELECT 
    e.*,
    ex.*,
    cs.*
FROM earnings_summary e, expenses_summary ex, company_stats cs;
*/

-- 8. Performance monitoring queries
-- Use these to check if optimizations are working:

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
