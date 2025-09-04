-- Quick setup script for owners functionality
-- Run this in your Supabase SQL editor

-- Add owner role to existing user_role enum (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE user_role ADD VALUE 'owner';
    END IF;
END $$;

-- Create owners table
CREATE TABLE IF NOT EXISTS owners (
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

-- Create owner_cars junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS owner_cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, car_id)
);

-- Add owner_id to cars table for easier querying (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cars' AND column_name = 'owner_id') THEN
        ALTER TABLE cars ADD COLUMN owner_id UUID REFERENCES owners(id);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
CREATE INDEX IF NOT EXISTS idx_owners_phone ON owners(phone);
CREATE INDEX IF NOT EXISTS idx_owner_cars_owner_id ON owner_cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_cars_car_id ON owner_cars(car_id);
CREATE INDEX IF NOT EXISTS idx_cars_owner_id ON cars(owner_id);

-- Create updated_at trigger for owners table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_owners_updated_at ON owners;
CREATE TRIGGER update_owners_updated_at 
    BEFORE UPDATE ON owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_owner_cars_updated_at ON owner_cars;
CREATE TRIGGER update_owner_cars_updated_at 
    BEFORE UPDATE ON owner_cars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
DROP TRIGGER IF EXISTS update_car_owner_on_assignment ON owner_cars;
CREATE TRIGGER update_car_owner_on_assignment
    AFTER INSERT OR UPDATE OR DELETE ON owner_cars
    FOR EACH ROW EXECUTE FUNCTION update_car_owner_id();

-- Enable Row Level Security
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_cars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for owners
DROP POLICY IF EXISTS "Everyone can view owners" ON owners;
CREATE POLICY "Everyone can view owners" ON owners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage owners" ON owners;
CREATE POLICY "Admins can manage owners" ON owners FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

-- Allow service role to manage owners (for API operations)
DROP POLICY IF EXISTS "Service role can manage owners" ON owners;
CREATE POLICY "Service role can manage owners" ON owners FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for owner_cars
DROP POLICY IF EXISTS "Everyone can view owner_cars" ON owner_cars;
CREATE POLICY "Everyone can view owner_cars" ON owner_cars FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage owner_cars" ON owner_cars;
CREATE POLICY "Admins can manage owner_cars" ON owner_cars FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

-- Allow service role to manage owner_cars (for API operations)
DROP POLICY IF EXISTS "Service role can manage owner_cars" ON owner_cars;
CREATE POLICY "Service role can manage owner_cars" ON owner_cars FOR ALL USING (auth.role() = 'service_role');

-- Create view for easy querying of owners with their cars
CREATE OR REPLACE VIEW owners_with_cars AS
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

-- Create view for cars with their owners
CREATE OR REPLACE VIEW cars_with_owners AS
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

-- Insert sample data (optional)
INSERT INTO owners (name, email, phone, address) VALUES
('John Smith', 'john.smith@example.com', '+971501234580', '123 Main Street, Dubai'),
('Sarah Johnson', 'sarah.johnson@example.com', '+971501234581', '456 Business Bay, Dubai'),
('Ahmed Al-Rashid', 'ahmed.rashid@example.com', '+971501234582', '789 Jumeirah, Dubai')
ON CONFLICT (email) DO NOTHING;

-- Success message
SELECT 'Owners database setup completed successfully!' as message;
