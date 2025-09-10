-- Complete ZapStop Database Schema for Neon PostgreSQL
-- This script creates all tables, indexes, triggers, and sample data

-- =============================================
-- 1. CREATE ENUMS
-- =============================================

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'driver', 'owner');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leave_type AS ENUM ('sick', 'personal', 'vacation', 'emergency', 'other');

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    phone VARCHAR(20),
    assigned_car_id UUID,
    documents JSONB,
    document_expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create owners table
CREATE TABLE owners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    documents JSONB,
    document_expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cars table
CREATE TABLE cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(255) NOT NULL,
    monthly_due DECIMAL(10,2) NOT NULL DEFAULT 7500.00,
    assigned_driver_id UUID,
    owner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create owner_cars junction table for many-to-many relationship
CREATE TABLE owner_cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL,
    car_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, car_id)
);

-- Create driver_earnings table
CREATE TABLE driver_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    uber_cash DECIMAL(10,2) DEFAULT 0.00,
    uber_account DECIMAL(10,2) DEFAULT 0.00,
    bolt_cash DECIMAL(10,2) DEFAULT 0.00,
    bolt_account DECIMAL(10,2) DEFAULT 0.00,
    uber_rides_count INTEGER DEFAULT 0,
    bolt_rides_count INTEGER DEFAULT 0,
    individual_rides_count INTEGER DEFAULT 0,
    individual_rides_cash DECIMAL(10,2) DEFAULT 0.00,
    individual_rides_account DECIMAL(10,2) DEFAULT 0.00,
    notes VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver_expenses table
CREATE TABLE driver_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    expense_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(500),
    proof_url VARCHAR(500),
    status expense_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status attendance_status DEFAULT 'present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL,
    leave_type leave_type NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending',
    admin_notes TEXT,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. ADD FOREIGN KEY CONSTRAINTS
-- =============================================

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_assigned_car 
    FOREIGN KEY (assigned_car_id) REFERENCES cars(id);

ALTER TABLE cars ADD CONSTRAINT fk_cars_assigned_driver 
    FOREIGN KEY (assigned_driver_id) REFERENCES users(id);

ALTER TABLE cars ADD CONSTRAINT fk_cars_owner 
    FOREIGN KEY (owner_id) REFERENCES owners(id);

ALTER TABLE owner_cars ADD CONSTRAINT fk_owner_cars_owner 
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE;

ALTER TABLE owner_cars ADD CONSTRAINT fk_owner_cars_car 
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE;

ALTER TABLE driver_earnings ADD CONSTRAINT fk_driver_earnings_driver 
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE driver_expenses ADD CONSTRAINT fk_driver_expenses_driver 
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attendance ADD CONSTRAINT fk_attendance_driver 
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_driver 
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_approved_by 
    FOREIGN KEY (approved_by) REFERENCES users(id);

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_assigned_car ON users(assigned_car_id);

-- Owners indexes
CREATE INDEX idx_owners_email ON owners(email);
CREATE INDEX idx_owners_phone ON owners(phone);

-- Cars indexes
CREATE INDEX idx_cars_plate_number ON cars(plate_number);
CREATE INDEX idx_cars_assigned_driver ON cars(assigned_driver_id);
CREATE INDEX idx_cars_owner_id ON cars(owner_id);

-- Owner_cars indexes
CREATE INDEX idx_owner_cars_owner_id ON owner_cars(owner_id);
CREATE INDEX idx_owner_cars_car_id ON owner_cars(car_id);

-- Driver earnings indexes
CREATE INDEX idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX idx_driver_earnings_date ON driver_earnings(date);
CREATE INDEX idx_driver_earnings_driver_date ON driver_earnings(driver_id, date);

-- Driver expenses indexes
CREATE INDEX idx_driver_expenses_driver_id ON driver_expenses(driver_id);
CREATE INDEX idx_driver_expenses_date ON driver_expenses(date);
CREATE INDEX idx_driver_expenses_status ON driver_expenses(status);
CREATE INDEX idx_driver_expenses_driver_date ON driver_expenses(driver_id, date);

-- Attendance indexes
CREATE INDEX idx_attendance_driver_id ON attendance(driver_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_driver_date ON attendance(driver_id, date);

-- Leave requests indexes
CREATE INDEX idx_leave_requests_driver_id ON leave_requests(driver_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_approved_by ON leave_requests(approved_by);

-- =============================================
-- 5. CREATE TRIGGER FUNCTIONS
-- =============================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to automatically update cars.owner_id when owner_cars changes
CREATE OR REPLACE FUNCTION update_car_owner_id()
RETURNS TRIGGER AS $$
DECLARE
    target_car_id UUID;
BEGIN
    -- Determine which car_id to update based on trigger operation
    IF TG_OP = 'DELETE' THEN
        target_car_id := OLD.car_id;
    ELSE
        target_car_id := NEW.car_id;
    END IF;
    
    -- Update the car's owner_id to the first owner (for easier querying)
    UPDATE cars 
    SET owner_id = (
        SELECT owner_id 
        FROM owner_cars 
        WHERE car_id = target_car_id 
        ORDER BY assigned_at ASC 
        LIMIT 1
    )
    WHERE id = target_car_id;
    
    -- Return appropriate value based on trigger operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ language 'plpgsql';

-- =============================================
-- 6. CREATE TRIGGERS
-- =============================================

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owners_updated_at 
    BEFORE UPDATE ON owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at 
    BEFORE UPDATE ON cars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owner_cars_updated_at 
    BEFORE UPDATE ON owner_cars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_earnings_updated_at 
    BEFORE UPDATE ON driver_earnings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_expenses_updated_at 
    BEFORE UPDATE ON driver_expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at 
    BEFORE UPDATE ON leave_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update car owner_id when owner_cars changes
CREATE TRIGGER update_car_owner_on_assignment
    AFTER INSERT OR UPDATE OR DELETE ON owner_cars
    FOR EACH ROW EXECUTE FUNCTION update_car_owner_id();

-- =============================================
-- 7. CREATE VIEWS FOR EASY QUERYING
-- =============================================

-- View for owners with their cars
CREATE VIEW owners_with_cars AS
SELECT 
    o.id,
    o.name,
    o.email,
    o.phone,
    o.address,
    o.documents,
    o.document_expiry_date,
    o.created_at,
    o.updated_at,
    COUNT(oc.car_id) as total_cars,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'id', c.id,
            'plate_number', c.plate_number,
            'model', c.model,
            'monthly_due', c.monthly_due,
            'assigned_driver_id', c.assigned_driver_id,
            'assigned_at', oc.assigned_at
        ) ORDER BY oc.assigned_at
    ) FILTER (WHERE c.id IS NOT NULL) as cars
FROM owners o
LEFT JOIN owner_cars oc ON o.id = oc.owner_id
LEFT JOIN cars c ON oc.car_id = c.id
GROUP BY o.id, o.name, o.email, o.phone, o.address, o.documents, o.document_expiry_date, o.created_at, o.updated_at;

-- View for cars with their owners
CREATE VIEW cars_with_owners AS
SELECT 
    c.id,
    c.plate_number,
    c.model,
    c.monthly_due,
    c.assigned_driver_id,
    c.owner_id,
    c.created_at,
    c.updated_at,
    o.name as owner_name,
    o.email as owner_email,
    o.phone as owner_phone,
    u.name as driver_name,
    u.email as driver_email
FROM cars c
LEFT JOIN owners o ON c.owner_id = o.id
LEFT JOIN users u ON c.assigned_driver_id = u.id;

-- =============================================
-- 8. INSERT SAMPLE DATA
-- =============================================

-- Insert sample owners
INSERT INTO owners (name, email, phone, address) VALUES
('John Smith', 'john.smith@example.com', '+971501234580', '123 Main Street, Dubai'),
('Sarah Johnson', 'sarah.johnson@example.com', '+971501234581', '456 Business Bay, Dubai'),
('Ahmed Al-Rashid', 'ahmed.rashid@example.com', '+971501234582', '789 Jumeirah, Dubai');

-- Insert sample cars
INSERT INTO cars (plate_number, model, monthly_due) VALUES
('ABC-123', 'Toyota Camry 2023', 7500.00),
('XYZ-789', 'Honda Accord 2023', 7500.00),
('DEF-456', 'Nissan Altima 2023', 7500.00),
('GHI-101', 'Hyundai Elantra 2023', 7500.00),
('JKL-202', 'Kia Optima 2023', 7500.00);

-- Insert sample users (with hashed passwords - replace with actual hashes)
INSERT INTO users (name, email, password_hash, role, phone) VALUES
('Admin User', 'admin@zapstop.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSK.2K2', 'admin', '+971501234567'),
('Accountant User', 'accountant@zapstop.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSK.2K2', 'accountant', '+971501234568'),
('Driver 1', 'driver1@zapstop.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSK.2K2', 'driver', '+971501234569'),
('Driver 2', 'driver2@zapstop.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSK.2K2', 'driver', '+971501234570'),
('Driver 3', 'driver3@zapstop.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HSK.2K2', 'driver', '+971501234571');

-- Update cars with assigned drivers
UPDATE cars SET assigned_driver_id = (SELECT id FROM users WHERE email = 'driver1@zapstop.com') WHERE plate_number = 'ABC-123';
UPDATE cars SET assigned_driver_id = (SELECT id FROM users WHERE email = 'driver2@zapstop.com') WHERE plate_number = 'XYZ-789';
UPDATE cars SET assigned_driver_id = (SELECT id FROM users WHERE email = 'driver3@zapstop.com') WHERE plate_number = 'DEF-456';

-- Update users with assigned cars
UPDATE users SET assigned_car_id = (SELECT id FROM cars WHERE plate_number = 'ABC-123') WHERE email = 'driver1@zapstop.com';
UPDATE users SET assigned_car_id = (SELECT id FROM cars WHERE plate_number = 'XYZ-789') WHERE email = 'driver2@zapstop.com';
UPDATE users SET assigned_car_id = (SELECT id FROM cars WHERE plate_number = 'DEF-456') WHERE email = 'driver3@zapstop.com';

-- Assign cars to owners
INSERT INTO owner_cars (owner_id, car_id) VALUES
((SELECT id FROM owners WHERE email = 'john.smith@example.com'), (SELECT id FROM cars WHERE plate_number = 'ABC-123')),
((SELECT id FROM owners WHERE email = 'john.smith@example.com'), (SELECT id FROM cars WHERE plate_number = 'XYZ-789')),
((SELECT id FROM owners WHERE email = 'sarah.johnson@example.com'), (SELECT id FROM cars WHERE plate_number = 'DEF-456')),
((SELECT id FROM owners WHERE email = 'sarah.johnson@example.com'), (SELECT id FROM cars WHERE plate_number = 'GHI-101')),
((SELECT id FROM owners WHERE email = 'ahmed.rashid@example.com'), (SELECT id FROM cars WHERE plate_number = 'JKL-202'));

-- Insert sample earnings data for the last 30 days
INSERT INTO driver_earnings (driver_id, date, uber_cash, uber_account, bolt_cash, bolt_account, uber_rides_count, bolt_rides_count, individual_rides_count, individual_rides_cash, individual_rides_account, notes)
SELECT 
    driver_id,
    date,
    ROUND((RANDOM() * 200 + 50)::numeric, 2) as uber_cash,
    ROUND((RANDOM() * 300 + 100)::numeric, 2) as uber_account,
    ROUND((RANDOM() * 150 + 30)::numeric, 2) as bolt_cash,
    ROUND((RANDOM() * 250 + 80)::numeric, 2) as bolt_account,
    FLOOR(RANDOM() * 20 + 5)::integer as uber_rides_count,
    FLOOR(RANDOM() * 15 + 3)::integer as bolt_rides_count,
    FLOOR(RANDOM() * 10 + 2)::integer as individual_rides_count,
    ROUND((RANDOM() * 100 + 20)::numeric, 2) as individual_rides_cash,
    ROUND((RANDOM() * 80 + 15)::numeric, 2) as individual_rides_account,
    'Sample earnings data'
FROM (
    SELECT 
        u.id as driver_id,
        CURRENT_DATE - (s.i || ' days')::interval as date
    FROM users u
    CROSS JOIN generate_series(0, 29) as s(i)
    WHERE u.role = 'driver'
) t;

-- Insert sample expenses
INSERT INTO driver_expenses (driver_id, date, expense_type, amount, description, status)
SELECT 
    u.id as driver_id,
    CURRENT_DATE - (RANDOM() * 30)::integer as date,
    expense_types.type,
    ROUND((RANDOM() * 200 + 10)::numeric, 2) as amount,
    'Sample expense: ' || expense_types.type,
    CASE 
        WHEN RANDOM() > 0.7 THEN 'approved'::expense_status
        WHEN RANDOM() > 0.9 THEN 'rejected'::expense_status
        ELSE 'pending'::expense_status
    END as status
FROM users u
CROSS JOIN (
    VALUES 
        ('Fuel'),
        ('Car Maintenance'),
        ('Toll Fees'),
        ('Parking'),
        ('Food'),
        ('Phone Bill')
) as expense_types(type)
WHERE u.role = 'driver'
LIMIT 20;

-- Insert sample attendance data
INSERT INTO attendance (driver_id, date, start_time, end_time, status)
SELECT 
    u.id as driver_id,
    CURRENT_DATE - (s.i || ' days')::interval as date,
    CASE 
        WHEN RANDOM() > 0.1 THEN CURRENT_DATE - (s.i || ' days')::interval + '08:00:00'::time
        ELSE NULL
    END as start_time,
    CASE 
        WHEN RANDOM() > 0.1 THEN CURRENT_DATE - (s.i || ' days')::interval + '20:00:00'::time
        ELSE NULL
    END as end_time,
    CASE 
        WHEN RANDOM() > 0.1 THEN 'present'::attendance_status
        WHEN RANDOM() > 0.8 THEN 'leave'::attendance_status
        ELSE 'absent'::attendance_status
    END as status
FROM users u
CROSS JOIN generate_series(0, 29) as s(i)
WHERE u.role = 'driver';

-- Insert sample leave requests
INSERT INTO leave_requests (driver_id, leave_type, start_date, end_date, reason, status, approved_by)
SELECT 
    u.id as driver_id,
    leave_types.type,
    CURRENT_DATE + (RANDOM() * 30)::integer as start_date,
    CURRENT_DATE + (RANDOM() * 30)::integer + (RANDOM() * 5 + 1)::integer as end_date,
    'Sample leave request: ' || leave_types.type,
    CASE 
        WHEN RANDOM() > 0.6 THEN 'approved'::leave_status
        WHEN RANDOM() > 0.8 THEN 'rejected'::leave_status
        ELSE 'pending'::leave_status
    END as status,
    CASE 
        WHEN RANDOM() > 0.6 THEN (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
        ELSE NULL
    END as approved_by
FROM users u
CROSS JOIN (
    VALUES 
        ('sick'::leave_type),
        ('personal'::leave_type),
        ('vacation'::leave_type),
        ('emergency'::leave_type)
) as leave_types(type)
WHERE u.role = 'driver'
LIMIT 10;

-- =============================================
-- 9. VERIFICATION QUERIES
-- =============================================

-- Verify table creation
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify sample data
SELECT 'Users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'Owners', COUNT(*) FROM owners
UNION ALL
SELECT 'Cars', COUNT(*) FROM cars
UNION ALL
SELECT 'Owner_Cars', COUNT(*) FROM owner_cars
UNION ALL
SELECT 'Driver_Earnings', COUNT(*) FROM driver_earnings
UNION ALL
SELECT 'Driver_Expenses', COUNT(*) FROM driver_expenses
UNION ALL
SELECT 'Attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'Leave_Requests', COUNT(*) FROM leave_requests;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

SELECT 'ZapStop database schema created successfully!' as status;
