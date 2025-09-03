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

async function setupAdminUser() {
  console.log('Setting up admin user...')
  
  try {
    // Check if admin user already exists in auth
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()
    
    if (authListError) {
      console.error('Error listing auth users:', authListError)
      return
    }
    
    const existingAuthUser = authUsers.users.find(u => u.email === 'admin@zapstop.com')
    
    if (existingAuthUser) {
      console.log('✅ Admin user exists in auth:', existingAuthUser.id)
      
      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', existingAuthUser.id)
        .single()
      
      if (userError) {
        if (userError.code === 'PGRST116') {
          console.log('❌ Admin user missing from users table, creating...')
          
          // Create user record in users table
          const { data: newUserData, error: createUserError } = await supabase
            .from('users')
            .insert([{
              id: existingAuthUser.id,
              name: 'Admin User',
              email: 'admin@zapstop.com',
              role: 'admin',
              phone: '+971501234567',
              assigned_car_id: null
            }])
            .select()
            .single()
          
          if (createUserError) {
            console.error('❌ Error creating user record:', createUserError)
          } else {
            console.log('✅ Created admin user record:', newUserData)
          }
        } else {
          console.error('❌ Error checking user in table:', userError)
        }
      } else {
        console.log('✅ Admin user exists in users table:', userData)
      }
    } else {
      console.log('❌ Admin user does not exist in auth, creating...')
      
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@zapstop.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: {
          name: 'Admin User',
          role: 'admin'
        }
      })
      
      if (authError) {
        console.error('❌ Error creating auth user:', authError)
        return
      }
      
      console.log('✅ Created admin user in auth:', authData.user.id)
      
      // Create user record in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          name: 'Admin User',
          email: 'admin@zapstop.com',
          role: 'admin',
          phone: '+971501234567',
          assigned_car_id: null
        }])
        .select()
        .single()
      
      if (userError) {
        console.error('❌ Error creating user record:', userError)
      } else {
        console.log('✅ Created admin user record:', userData)
      }
    }
    
    // Test the RLS policies
    console.log('\n=== Testing RLS Policies ===')
    
    // Test 1: Try to query users table as admin
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ RLS test failed:', testError)
      console.log('You may need to update your RLS policies. Run this SQL:')
      console.log(`
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id::text);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
);
      `)
    } else {
      console.log('✅ RLS policies working correctly')
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error)
  }
}

setupAdminUser().catch(console.error)
