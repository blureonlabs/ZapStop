-- Clean up legacy driver data
-- This will remove earnings and expenses for users who are not drivers

-- First, let's see what users we have and their roles
SELECT id, name, email, role, created_at 
FROM users 
ORDER BY created_at;

-- Remove earnings for non-driver users
DELETE FROM driver_earnings 
WHERE driver_id IN (
  SELECT id FROM users WHERE role != 'driver'
);

-- Remove expenses for non-driver users  
DELETE FROM driver_expenses 
WHERE driver_id IN (
  SELECT id FROM users WHERE role != 'driver'
);

-- Remove attendance records for non-driver users
DELETE FROM attendance 
WHERE driver_id IN (
  SELECT id FROM users WHERE role != 'driver'
);

-- Optional: If you want to completely remove non-driver users (be careful!)
-- DELETE FROM users WHERE role != 'driver';

-- Check the results
SELECT 'Remaining users:' as info;
SELECT id, name, email, role FROM users ORDER BY role, name;

SELECT 'Remaining earnings:' as info;
SELECT COUNT(*) as count FROM driver_earnings;

SELECT 'Remaining expenses:' as info;
SELECT COUNT(*) as count FROM driver_expenses;
