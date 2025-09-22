-- Performance optimization indexes for Zap Stop
-- Run this script to add missing indexes for better query performance

-- Indexes for date-based queries (most common in dashboards)
CREATE INDEX IF NOT EXISTS idx_driver_earnings_date ON driver_earnings(date);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_date ON driver_expenses(date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date ON leave_requests(start_date, end_date);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_date_status ON driver_earnings(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_driver_date_status ON driver_expenses(driver_id, date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_driver_date ON attendance(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_driver_status ON leave_requests(driver_id, status);

-- Indexes for status-based filtering
CREATE INDEX IF NOT EXISTS idx_driver_expenses_status ON driver_expenses(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Indexes for foreign key relationships
CREATE INDEX IF NOT EXISTS idx_owner_cars_owner_id ON owner_cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_cars_car_id ON owner_cars(car_id);

-- Indexes for text search (if needed in future)
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);

-- Partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_driver_expenses_pending ON driver_expenses(driver_id, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_leave_requests_pending ON leave_requests(driver_id, created_at) WHERE status = 'pending';

-- Indexes for time-based aggregations
CREATE INDEX IF NOT EXISTS idx_driver_earnings_monthly ON driver_earnings(date_trunc('month', date), driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_monthly ON driver_expenses(date_trunc('month', date), driver_id);

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE cars;
ANALYZE driver_earnings;
ANALYZE driver_expenses;
ANALYZE attendance;
ANALYZE leave_requests;
ANALYZE owners;
ANALYZE owner_cars;
