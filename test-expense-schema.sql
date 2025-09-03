-- Test script to check if description column exists in driver_expenses table
-- Run this in your Supabase SQL editor

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_expenses' 
ORDER BY ordinal_position;

-- Test insert with description
INSERT INTO driver_expenses (driver_id, date, expense_type, amount, description, proof_url)
VALUES (
  auth.uid(), 
  CURRENT_DATE, 
  'test', 
  10.00, 
  'Test description', 
  'test-url'
);

-- Check if insert worked
SELECT * FROM driver_expenses WHERE expense_type = 'test' ORDER BY created_at DESC LIMIT 1;

-- Clean up test data
DELETE FROM driver_expenses WHERE expense_type = 'test';
