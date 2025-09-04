-- Add owner role to existing user_role enum
ALTER TYPE user_role ADD VALUE 'owner';

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

-- Create owner_cars junction table for many-to-many relationship
CREATE TABLE owner_cars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, car_id)
);

-- Add owner_id to cars table for easier querying
ALTER TABLE cars ADD COLUMN owner_id UUID REFERENCES owners(id);

-- Create indexes for better performance
CREATE INDEX idx_owners_email ON owners(email);
CREATE INDEX idx_owners_phone ON owners(phone);
CREATE INDEX idx_owner_cars_owner_id ON owner_cars(owner_id);
CREATE INDEX idx_owner_cars_car_id ON owner_cars(car_id);
CREATE INDEX idx_cars_owner_id ON cars(owner_id);

-- Create updated_at trigger for owners table
CREATE TRIGGER update_owners_updated_at 
    BEFORE UPDATE ON owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owner_cars_updated_at 
    BEFORE UPDATE ON owner_cars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_cars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for owners
CREATE POLICY "Everyone can view owners" ON owners FOR SELECT USING (true);
CREATE POLICY "Admins can manage owners" ON owners FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

-- Create RLS policies for owner_cars
CREATE POLICY "Everyone can view owner_cars" ON owner_cars FOR SELECT USING (true);
CREATE POLICY "Admins can manage owner_cars" ON owner_cars FOR ALL USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = auth.uid()::text 
        AND role = 'admin'
    )
);

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

-- Insert sample owners data
INSERT INTO owners (name, email, phone, address) VALUES
('John Smith', 'john.smith@example.com', '+971501234580', '123 Main Street, Dubai'),
('Sarah Johnson', 'sarah.johnson@example.com', '+971501234581', '456 Business Bay, Dubai'),
('Ahmed Al-Rashid', 'ahmed.rashid@example.com', '+971501234582', '789 Jumeirah, Dubai');

-- Create sample cars if they don't exist
INSERT INTO cars (plate_number, model, monthly_due) VALUES
('ABC-123', 'Toyota Camry 2023', 7500.00),
('XYZ-789', 'Honda Accord 2023', 7500.00),
('DEF-456', 'Nissan Altima 2023', 7500.00),
('GHI-101', 'Hyundai Elantra 2023', 7500.00),
('JKL-202', 'Kia Optima 2023', 7500.00)
ON CONFLICT (plate_number) DO NOTHING;

-- Assign cars to owners using a safer approach
-- Get the IDs first to avoid null issues
DO $$
DECLARE
    john_id UUID;
    sarah_id UUID;
    ahmed_id UUID;
    car1_id UUID;
    car2_id UUID;
    car3_id UUID;
    car4_id UUID;
    car5_id UUID;
BEGIN
    -- Get owner IDs
    SELECT id INTO john_id FROM owners WHERE email = 'john.smith@example.com';
    SELECT id INTO sarah_id FROM owners WHERE email = 'sarah.johnson@example.com';
    SELECT id INTO ahmed_id FROM owners WHERE email = 'ahmed.rashid@example.com';
    
    -- Get car IDs
    SELECT id INTO car1_id FROM cars WHERE plate_number = 'ABC-123';
    SELECT id INTO car2_id FROM cars WHERE plate_number = 'XYZ-789';
    SELECT id INTO car3_id FROM cars WHERE plate_number = 'DEF-456';
    SELECT id INTO car4_id FROM cars WHERE plate_number = 'GHI-101';
    SELECT id INTO car5_id FROM cars WHERE plate_number = 'JKL-202';
    
    -- Insert owner-car relationships only if both IDs exist
    IF john_id IS NOT NULL AND car1_id IS NOT NULL THEN
        INSERT INTO owner_cars (owner_id, car_id) VALUES (john_id, car1_id) ON CONFLICT DO NOTHING;
    END IF;
    
    IF john_id IS NOT NULL AND car2_id IS NOT NULL THEN
        INSERT INTO owner_cars (owner_id, car_id) VALUES (john_id, car2_id) ON CONFLICT DO NOTHING;
    END IF;
    
    IF sarah_id IS NOT NULL AND car3_id IS NOT NULL THEN
        INSERT INTO owner_cars (owner_id, car_id) VALUES (sarah_id, car3_id) ON CONFLICT DO NOTHING;
    END IF;
    
    IF sarah_id IS NOT NULL AND car4_id IS NOT NULL THEN
        INSERT INTO owner_cars (owner_id, car_id) VALUES (sarah_id, car4_id) ON CONFLICT DO NOTHING;
    END IF;
    
    IF ahmed_id IS NOT NULL AND car5_id IS NOT NULL THEN
        INSERT INTO owner_cars (owner_id, car_id) VALUES (ahmed_id, car5_id) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Create view for easy querying of owners with their cars
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

-- Create view for cars with their owners
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
