-- Direct test for expense submission
-- Run this in your Supabase SQL editor

-- Check if driver_expenses table exists and structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'driver_expenses' 
ORDER BY ordinal_position;

-- Test direct insert into driver_expenses
INSERT INTO driver_expenses (driver_id, date, expense_type, amount, proof_url)
VALUES (
    auth.uid(), 
    CURRENT_DATE, 
    'fuel', 
    25.00, 
    'direct-test'
);

-- Check if insert worked
SELECT * FROM driver_expenses 
WHERE driver_id = auth.uid() 
AND proof_url = 'direct-test'
ORDER BY created_at DESC LIMIT 1;

-- Check RLS policies for driver_expenses
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'driver_expenses';

-- Clean up test data
DELETE FROM driver_expenses WHERE proof_url = 'direct-test';
