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

async function applyRLSFix() {
  console.log('Applying RLS policy fixes...')
  
  try {
    // Test current state
    console.log('Testing current RLS policies...')
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.log('❌ Current RLS test failed:', testError.message)
      console.log('This confirms the RLS policies need to be fixed.')
    } else {
      console.log('✅ Current RLS policies are working')
      console.log('Sample data:', testData)
    }
    
    // Since we can't execute raw SQL directly, let's check if the admin user can be fetched
    console.log('\n=== Testing Admin User Fetch ===')
    
    // Get the admin user ID
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()
    
    if (authListError) {
      console.error('❌ Error listing auth users:', authListError)
      return
    }
    
    const adminUser = authUsers.users.find(u => u.email === 'admin@zapstop.com')
    
    if (!adminUser) {
      console.error('❌ Admin user not found in auth')
      return
    }
    
    console.log('✅ Admin user found in auth:', adminUser.id)
    
    // Try to fetch the admin user from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminUser.id)
      .single()
    
    if (userError) {
      console.log('❌ Error fetching admin user from users table:', userError.message)
      console.log('This is the root cause of the login issue.')
      
      // The issue is likely that the RLS policies are preventing the fetch
      // Let's try to understand what's happening
      console.log('\n=== Debugging RLS Issue ===')
      console.log('Admin user metadata:', adminUser.user_metadata)
      console.log('Admin user app metadata:', adminUser.app_metadata)
      
    } else {
      console.log('✅ Admin user fetched successfully from users table:', userData)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

applyRLSFix().catch(console.error)
