-- Fix driver_expenses table schema
-- Run this in your Supabase SQL editor

-- First, check if description column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_expenses' 
ORDER BY ordinal_position;

-- Add description column if it doesn't exist
ALTER TABLE driver_expenses 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_expenses' 
ORDER BY ordinal_position;

-- Test insert to make sure it works
INSERT INTO driver_expenses (driver_id, date, expense_type, amount, description, proof_url)
VALUES (
  auth.uid(), 
  CURRENT_DATE, 
  'test_fuel', 
  25.00, 
  'Test fuel expense with description', 
  'test-receipt-url'
);

-- Check if the insert worked
SELECT * FROM driver_expenses WHERE expense_type = 'test_fuel' ORDER BY created_at DESC LIMIT 1;

-- Clean up test data
DELETE FROM driver_expenses WHERE expense_type = 'test_fuel';
