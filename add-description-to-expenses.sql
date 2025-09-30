-- Add description field to driver_expenses table
ALTER TABLE driver_expenses 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update the table comment to reflect the new field
COMMENT ON COLUMN driver_expenses.description IS 'Description of the expense';
