-- Debug script to check user setup and RLS policies
-- Run this in your Supabase SQL editor

-- Check if the authenticated user exists in users table
SELECT 
    id, 
    name, 
    role, 
    email,
    assigned_car_id
FROM users 
WHERE id = auth.uid();

-- Check RLS policies for driver_earnings
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'driver_earnings';

-- Check RLS policies for driver_expenses
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'driver_expenses';

-- Check RLS policies for attendance
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'attendance';

-- Test if we can insert into driver_earnings
INSERT INTO driver_earnings (driver_id, date, uber_cash, uber_account, bolt_cash, bolt_account, individual_cash, notes)
VALUES (
    auth.uid(), 
    CURRENT_DATE, 
    100.00, 
    50.00, 
    75.00, 
    25.00, 
    30.00, 
    'Test from SQL editor'
);

-- Check if the insert worked
SELECT * FROM driver_earnings WHERE driver_id = auth.uid() ORDER BY created_at DESC LIMIT 1;

-- Clean up test data
DELETE FROM driver_earnings WHERE notes = 'Test from SQL editor';
