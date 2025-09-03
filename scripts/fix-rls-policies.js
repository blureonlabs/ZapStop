const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixRLSPolicies() {
  console.log('Fixing RLS policies...')
  
  try {
    // Apply the fixed RLS policies
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })

    if (error) {
      console.error('❌ Error applying RLS policies:', error)
      return
    }

    console.log('✅ RLS policies updated successfully')
    
    // Test the policies
    console.log('\n=== Testing RLS Policies ===')
    
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ RLS test failed:', testError)
    } else {
      console.log('✅ RLS policies working correctly')
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error)
  }
}

fixRLSPolicies().catch(console.error)
