-- Database Performance Optimization Indexes
-- Run these commands in your Supabase SQL editor to improve query performance

-- Indexes for driver_earnings table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_earnings_date 
ON driver_earnings(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_earnings_driver_date 
ON driver_earnings(driver_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_earnings_driver_id 
ON driver_earnings(driver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_earnings_date_range 
ON driver_earnings(date) WHERE date >= CURRENT_DATE - INTERVAL '1 year';

-- Indexes for driver_expenses table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_expenses_date 
ON driver_expenses(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_expenses_status 
ON driver_expenses(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_expenses_driver_id 
ON driver_expenses(driver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_expenses_driver_status 
ON driver_expenses(driver_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_driver_expenses_date_status 
ON driver_expenses(date, status);

-- Indexes for attendance table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date 
ON attendance(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_driver_id 
ON attendance(driver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_driver_date 
ON attendance(driver_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status 
ON attendance(status);

-- Indexes for users table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_assigned_car_id 
ON users(assigned_car_id) WHERE assigned_car_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

-- Indexes for cars table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_assigned_driver_id 
ON cars(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_owner_id 
ON cars(owner_id) WHERE owner_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_plate_number 
ON cars(plate_number);

-- Indexes for leave_requests table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_driver_id 
ON leave_requests(driver_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_status 
ON leave_requests(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_date_range 
ON leave_requests(start_date, end_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_driver_status 
ON leave_requests(driver_id, status);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_earnings_dashboard_stats 
ON driver_earnings(date, driver_id) 
WHERE date >= CURRENT_DATE - INTERVAL '1 year';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_dashboard_stats 
ON driver_expenses(date, status, driver_id) 
WHERE date >= CURRENT_DATE - INTERVAL '1 year' AND status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_dashboard_stats 
ON attendance(date, driver_id) 
WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_drivers 
ON users(assigned_car_id) 
WHERE role = 'driver' AND assigned_car_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_expenses 
ON driver_expenses(driver_id, date) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pending_leave_requests 
ON leave_requests(driver_id, start_date) 
WHERE status = 'pending';

-- Indexes for text search (if using full-text search)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_search 
ON users USING gin(to_tsvector('english', name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_plate_search 
ON cars USING gin(to_tsvector('english', plate_number));

-- Analyze tables after creating indexes
ANALYZE driver_earnings;
ANALYZE driver_expenses;
ANALYZE attendance;
ANALYZE users;
ANALYZE cars;
ANALYZE leave_requests;
ANALYZE owners;

-- Show index usage statistics (run this to monitor index effectiveness)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;
