-- Complete Supabase Schema with Owners Functionality
-- This file includes the original schema plus the new owners table and relationships

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'driver', 'owner');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leave_type AS ENUM ('sick', 'personal', 'vacation', 'emergency', 'other');

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

-- Create owners table
CREATE TABLE owners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
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
    owner_id UUID REFERENCES owners(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create owner_cars junction table for many-to-many relationship
CREATE TABLE owner_cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, car_id)
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
    description TEXT,
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

-- Create leave_requests table
CREATE TABLE leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending',
    admin_notes TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_assigned_car ON users(assigned_car_id);
CREATE INDEX idx_owners_email ON owners(email);
CREATE INDEX idx_owners_phone ON owners(phone);
CREATE INDEX idx_cars_assigned_driver ON cars(assigned_driver_id);
CREATE INDEX idx_cars_owner_id ON cars(owner_id);
CREATE INDEX idx_owner_cars_owner_id ON owner_cars(owner_id);
CREATE INDEX idx_owner_cars_car_id ON owner_cars(car_id);
CREATE INDEX idx_driver_earnings_driver_date ON driver_earnings(driver_id, date);
CREATE INDEX idx_driver_expenses_driver_date ON driver_expenses(driver_id, date);
CREATE INDEX idx_driver_expenses_status ON driver_expenses(status);
CREATE INDEX idx_attendance_driver_date ON attendance(driver_id, date);
CREATE INDEX idx_leave_requests_driver ON leave_requests(driver_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);

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
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owner_cars_updated_at BEFORE UPDATE ON owner_cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_earnings_updated_at BEFORE UPDATE ON driver_earnings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_expenses_updated_at BEFORE UPDATE ON driver_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Create trigger to update car owner_id when owner_cars changes
CREATE TRIGGER update_car_owner_on_assignment
    AFTER INSERT OR UPDATE OR DELETE ON owner_cars
    FOR EACH ROW EXECUTE FUNCTION update_car_owner_id();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

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

-- Owners policies
CREATE POLICY "Everyone can view owners" ON owners FOR SELECT USING (true);
CREATE POLICY "Admins can manage owners" ON owners FOR ALL USING (
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

-- Owner_cars policies
CREATE POLICY "Everyone can view owner_cars" ON owner_cars FOR SELECT USING (true);
CREATE POLICY "Admins can manage owner_cars" ON owner_cars FOR ALL USING (
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

-- Leave requests policies
CREATE POLICY "Drivers can view own leave requests" ON leave_requests FOR SELECT USING (auth.uid()::text = driver_id::text);
CREATE POLICY "Drivers can insert own leave requests" ON leave_requests FOR INSERT WITH CHECK (auth.uid()::text = driver_id::text);
CREATE POLICY "Admins can view all leave requests" ON leave_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);
CREATE POLICY "Admins can update leave requests" ON leave_requests FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);
CREATE POLICY "Service role can manage leave requests" ON leave_requests FOR ALL USING (auth.role() = 'service_role');

-- Create views for easy querying
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

-- Insert sample data
-- Insert cars first
INSERT INTO cars (plate_number, model, monthly_due) VALUES
('ABC-123', 'Toyota Camry 2023', 7500.00),
('XYZ-789', 'Honda Accord 2023', 7500.00),
('DEF-456', 'Nissan Altima 2023', 7500.00),
('GHI-101', 'Hyundai Elantra 2023', 7500.00),
('JKL-202', 'Kia Optima 2023', 7500.00);

-- Insert sample owners
INSERT INTO owners (name, email, phone, address) VALUES
('John Smith', 'john.smith@example.com', '+971501234580', '123 Main Street, Dubai'),
('Sarah Johnson', 'sarah.johnson@example.com', '+971501234581', '456 Business Bay, Dubai'),
('Ahmed Al-Rashid', 'ahmed.rashid@example.com', '+971501234582', '789 Jumeirah, Dubai');

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

-- Assign cars to owners (multiple cars per owner)
-- John Smith gets 2 cars
INSERT INTO owner_cars (owner_id, car_id) VALUES
((SELECT id FROM owners WHERE email = 'john.smith@example.com'), (SELECT id FROM cars WHERE plate_number = 'ABC-123')),
((SELECT id FROM owners WHERE email = 'john.smith@example.com'), (SELECT id FROM cars WHERE plate_number = 'XYZ-789'));

-- Sarah Johnson gets 2 cars
INSERT INTO owner_cars (owner_id, car_id) VALUES
((SELECT id FROM owners WHERE email = 'sarah.johnson@example.com'), (SELECT id FROM cars WHERE plate_number = 'DEF-456')),
((SELECT id FROM owners WHERE email = 'sarah.johnson@example.com'), (SELECT id FROM cars WHERE plate_number = 'GHI-101'));

-- Ahmed Al-Rashid gets 1 car
INSERT INTO owner_cars (owner_id, car_id) VALUES
((SELECT id FROM owners WHERE email = 'ahmed.rashid@example.com'), (SELECT id FROM cars WHERE plate_number = 'JKL-202'));

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
