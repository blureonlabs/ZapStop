-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'driver');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave');

-- Create users table (without car reference initially)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    assigned_car_id UUID,
    documents JSONB,
    document_expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cars table
CREATE TABLE cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(255) NOT NULL,
    monthly_due DECIMAL(10,2) DEFAULT 7500.00,
    assigned_driver_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for users.assigned_car_id after cars table is created
ALTER TABLE users ADD CONSTRAINT fk_users_assigned_car 
    FOREIGN KEY (assigned_car_id) REFERENCES cars(id);

-- Create driver_earnings table
CREATE TABLE driver_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    uber_cash DECIMAL(10,2) DEFAULT 0.00,
    uber_account DECIMAL(10,2) DEFAULT 0.00,
    bolt_cash DECIMAL(10,2) DEFAULT 0.00,
    bolt_account DECIMAL(10,2) DEFAULT 0.00,
    individual_cash DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, date)
);

-- Create driver_expenses table
CREATE TABLE driver_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    expense_type VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    proof_url TEXT,
    status expense_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create attendance table
CREATE TABLE attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status attendance_status DEFAULT 'present',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(driver_id, date)
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_assigned_car ON users(assigned_car_id);
CREATE INDEX idx_cars_assigned_driver ON cars(assigned_driver_id);
CREATE INDEX idx_driver_earnings_driver_date ON driver_earnings(driver_id, date);
CREATE INDEX idx_driver_expenses_driver_date ON driver_expenses(driver_id, date);
CREATE INDEX idx_driver_expenses_status ON driver_expenses(status);
CREATE INDEX idx_attendance_driver_date ON attendance(driver_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_earnings_updated_at BEFORE UPDATE ON driver_earnings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_expenses_updated_at BEFORE UPDATE ON driver_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own data and admins can view all
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Admins can view all users" ON users FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

-- Cars policies
CREATE POLICY "Everyone can view cars" ON cars FOR SELECT USING (true);
CREATE POLICY "Admins can manage cars" ON cars FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

-- Driver earnings policies
CREATE POLICY "Drivers can view own earnings" ON driver_earnings FOR SELECT USING (auth.uid()::text = driver_id::text);
CREATE POLICY "Drivers can insert own earnings" ON driver_earnings FOR INSERT WITH CHECK (auth.uid()::text = driver_id::text);
CREATE POLICY "Drivers can update own earnings" ON driver_earnings FOR UPDATE USING (auth.uid()::text = driver_id::text);
CREATE POLICY "Admins and accountants can view all earnings" ON driver_earnings FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'accountant')
    )
);

-- Driver expenses policies
CREATE POLICY "Drivers can view own expenses" ON driver_expenses FOR SELECT USING (auth.uid()::text = driver_id::text);
CREATE POLICY "Drivers can insert own expenses" ON driver_expenses FOR INSERT WITH CHECK (auth.uid()::text = driver_id::text);
CREATE POLICY "Admins and accountants can view all expenses" ON driver_expenses FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'accountant')
    )
);
CREATE POLICY "Admins and accountants can update expenses" ON driver_expenses FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'accountant')
    )
);

-- Attendance policies
CREATE POLICY "Drivers can view own attendance" ON attendance FOR SELECT USING (auth.uid()::text = driver_id::text);
CREATE POLICY "Drivers can insert own attendance" ON attendance FOR INSERT WITH CHECK (auth.uid()::text = driver_id::text);
CREATE POLICY "Drivers can update own attendance" ON attendance FOR UPDATE USING (auth.uid()::text = driver_id::text);
CREATE POLICY "Admins and accountants can view all attendance" ON attendance FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role IN ('admin', 'accountant')
    )
);

-- Insert sample data
-- Insert cars first
INSERT INTO cars (plate_number, model, monthly_due) VALUES
('ABC-123', 'Toyota Camry 2023', 7500.00),
('XYZ-789', 'Honda Accord 2023', 7500.00),
('DEF-456', 'Nissan Altima 2023', 7500.00);

-- Insert users (you'll need to create these through Supabase Auth first)
-- These are placeholder UUIDs - replace with actual user IDs from Supabase Auth
INSERT INTO users (id, name, role, email, phone, assigned_car_id) VALUES
('00000000-0000-0000-0000-000000000001', 'Admin User', 'admin', 'admin@zapstop.com', '+971501234567', NULL),
('00000000-0000-0000-0000-000000000002', 'Accountant User', 'accountant', 'accountant@zapstop.com', '+971501234568', NULL),
('00000000-0000-0000-0000-000000000003', 'Driver 1', 'driver', 'driver1@zapstop.com', '+971501234569', (SELECT id FROM cars WHERE plate_number = 'ABC-123')),
('00000000-0000-0000-0000-000000000004', 'Driver 2', 'driver', 'driver2@zapstop.com', '+971501234570', (SELECT id FROM cars WHERE plate_number = 'XYZ-789')),
('00000000-0000-0000-0000-000000000005', 'Driver 3', 'driver', 'driver3@zapstop.com', '+971501234571', (SELECT id FROM cars WHERE plate_number = 'DEF-456'));

-- Update cars with assigned drivers
UPDATE cars SET assigned_driver_id = '00000000-0000-0000-0000-000000000003' WHERE plate_number = 'ABC-123';
UPDATE cars SET assigned_driver_id = '00000000-0000-0000-0000-000000000004' WHERE plate_number = 'XYZ-789';
UPDATE cars SET assigned_driver_id = '00000000-0000-0000-0000-000000000005' WHERE plate_number = 'DEF-456';

-- Insert sample earnings data for the last 30 days
INSERT INTO driver_earnings (driver_id, date, uber_cash, uber_account, bolt_cash, bolt_account, individual_cash, notes)
SELECT 
    driver_id,
    date,
    ROUND((RANDOM() * 200 + 50)::numeric, 2) as uber_cash,
    ROUND((RANDOM() * 300 + 100)::numeric, 2) as uber_account,
    ROUND((RANDOM() * 150 + 30)::numeric, 2) as bolt_cash,
    ROUND((RANDOM() * 250 + 80)::numeric, 2) as bolt_account,
    ROUND((RANDOM() * 100 + 20)::numeric, 2) as individual_cash,
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
INSERT INTO driver_expenses (driver_id, date, expense_type, amount, status)
SELECT 
    u.id as driver_id,
    CURRENT_DATE - (RANDOM() * 30)::integer as date,
    expense_types.type,
    ROUND((RANDOM() * 200 + 10)::numeric, 2) as amount,
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
        WHEN RANDOM() > 0.1 THEN '08:00:00'::time
        ELSE NULL
    END as start_time,
    CASE 
        WHEN RANDOM() > 0.1 THEN '20:00:00'::time
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
