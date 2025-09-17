-- =============================================
-- AWS RDS SCHEMA (SIMPLIFIED)
-- =============================================

-- Create ENUM types first
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'driver', 'owner');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leave_type AS ENUM ('sick', 'personal', 'vacation', 'emergency', 'other');

-- ==========================================
-- Table: attendance
-- ==========================================
CREATE TABLE attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status attendance_status DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE attendance ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

-- ==========================================
-- Table: cars
-- ==========================================
CREATE TABLE cars (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    plate_number VARCHAR(20) NOT NULL,
    model VARCHAR(255) NOT NULL,
    monthly_due NUMERIC(10,2) NOT NULL DEFAULT 7500.00,
    assigned_driver_id UUID,
    owner_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cars ADD CONSTRAINT cars_pkey PRIMARY KEY (id);
ALTER TABLE cars ADD CONSTRAINT cars_plate_number_key UNIQUE (plate_number);

-- ==========================================
-- Table: driver_earnings
-- ==========================================
CREATE TABLE driver_earnings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    uber_cash NUMERIC(10,2) DEFAULT 0.00,
    uber_account NUMERIC(10,2) DEFAULT 0.00,
    bolt_cash NUMERIC(10,2) DEFAULT 0.00,
    bolt_account NUMERIC(10,2) DEFAULT 0.00,
    uber_rides_count INTEGER DEFAULT 0,
    bolt_rides_count INTEGER DEFAULT 0,
    individual_rides_count INTEGER DEFAULT 0,
    individual_rides_cash NUMERIC(10,2) DEFAULT 0.00,
    individual_rides_account NUMERIC(10,2) DEFAULT 0.00,
    notes VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE driver_earnings ADD CONSTRAINT driver_earnings_pkey PRIMARY KEY (id);

-- ==========================================
-- Table: driver_expenses
-- ==========================================
CREATE TABLE driver_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    expense_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    description VARCHAR(500),
    proof_url VARCHAR(500),
    status expense_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE driver_expenses ADD CONSTRAINT driver_expenses_pkey PRIMARY KEY (id);

-- ==========================================
-- Table: leave_requests
-- ==========================================
CREATE TABLE leave_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL,
    leave_type leave_type NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status leave_status DEFAULT 'pending',
    admin_notes TEXT,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE leave_requests ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);

-- ==========================================
-- Table: owner_cars
-- ==========================================
CREATE TABLE owner_cars (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    car_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE owner_cars ADD CONSTRAINT owner_cars_pkey PRIMARY KEY (id);
ALTER TABLE owner_cars ADD CONSTRAINT owner_cars_owner_id_car_id_key UNIQUE (car_id);

-- ==========================================
-- Table: owners
-- ==========================================
CREATE TABLE owners (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    documents JSONB,
    document_expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE owners ADD CONSTRAINT owners_pkey PRIMARY KEY (id);
ALTER TABLE owners ADD CONSTRAINT owners_email_key UNIQUE (email);

-- ==========================================
-- Table: users
-- ==========================================
CREATE TABLE users (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    phone VARCHAR(20),
    assigned_car_id UUID,
    documents JSONB,
    document_expiry_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- ==========================================
-- Insert sample data
-- ==========================================

-- Users data
INSERT INTO users (id, email, password_hash, name, role, phone, assigned_car_id, documents, document_expiry_date, created_at, updated_at) VALUES 
('7ad6e06b-ba75-4ebf-bcaa-c909aecab446', 'blureonlabs@gmail.com', '$2b$12$SKU2prRsD0x5tJJifB1hsOB8xFnRyrab2ndhJpvyfgvOkPcbiysHa', 'blureon', 'admin', '9944110859', NULL, NULL, NULL, '2025-09-12 18:20:11.764557+00:00', '2025-09-12 18:20:11.764557+00:00'),
('a32e07cc-144e-4be9-a5d5-1bf5bf115f18', 'hariaravind99@gmail.com', '$2b$12$z3BzawAGk2pfcgVrPrtesOmGOzxtsAMOnnhb.bqYhbpz9r661dJ.C', 'hari', 'driver', '9944110859', 'be3cda01-31be-45e1-8e76-6bee762c4fb1', NULL, NULL, '2025-09-12 18:23:51.942297+00:00', '2025-09-12 18:31:59.655225+00:00'),
('a2a89980-cb7e-45c0-a329-7681b7c0d50d', 'admin@gmail.com', '$2b$12$YbIydUgediHILxMFP7Ou0eykHTrscyLLHTUBesZ70RcmknuudhwxO', 'Admin User', 'admin', '+1234567890', NULL, NULL, NULL, '2025-09-14 09:37:27.646914+00:00', '2025-09-14 09:37:27.646914+00:00');

-- ==========================================
-- Create indexes for better performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_date ON driver_earnings(date);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_driver_id ON driver_expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_expenses_status ON driver_expenses(status);
CREATE INDEX IF NOT EXISTS idx_attendance_driver_id ON attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ==========================================
-- Verify the setup
-- ==========================================
SELECT 'Database setup completed successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT COUNT(*) as user_count FROM users;
SELECT email, name, role FROM users ORDER BY created_at;
