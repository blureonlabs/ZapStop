-- Fix RLS policies to resolve admin login issue
-- This addresses the circular dependency in the original policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create new policies that avoid circular dependency
-- Policy 1: Users can always view their own data (no role check needed)
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);

-- Policy 2: Users can update their own data (no role check needed)  
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Policy 3: Only admins can view all users (using user metadata instead of table lookup)
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);

-- Policy 4: Only admins can insert new users
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);

-- Policy 5: Only admins can delete users
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);

-- Policy 6: Only admins can update other users' data
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);
