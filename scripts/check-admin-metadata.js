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

async function checkAdminMetadata() {
  console.log('Checking admin user metadata...')
  
  try {
    // Get the admin user from auth
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
    
    console.log('Admin user details:')
    console.log('- ID:', adminUser.id)
    console.log('- Email:', adminUser.email)
    console.log('- User Metadata:', JSON.stringify(adminUser.user_metadata, null, 2))
    console.log('- App Metadata:', JSON.stringify(adminUser.app_metadata, null, 2))
    
    // Check if the role is in user_metadata
    if (!adminUser.user_metadata || !adminUser.user_metadata.role) {
      console.log('\n❌ Role not found in user_metadata. Updating...')
      
      // Update the user metadata to include the role
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        {
          user_metadata: {
            ...adminUser.user_metadata,
            role: 'admin'
          }
        }
      )
      
      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError)
      } else {
        console.log('✅ Updated user metadata:', updateData.user.user_metadata)
      }
    } else {
      console.log('✅ Role found in user_metadata:', adminUser.user_metadata.role)
    }
    
    // Now test the RLS policies with the anon key (simulating client-side behavior)
    console.log('\n=== Testing with Anon Key (Client-side simulation) ===')
    
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // First, sign in as the admin user
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: 'admin@zapstop.com',
      password: 'admin123'
    })
    
    if (signInError) {
      console.error('❌ Sign in error:', signInError)
      return
    }
    
    console.log('✅ Signed in successfully')
    console.log('Auth user:', signInData.user.id)
    console.log('User metadata:', signInData.user.user_metadata)
    
    // Now try to fetch the user from the users table
    const { data: userData, error: userError } = await anonSupabase
      .from('users')
      .select('*')
      .eq('id', signInData.user.id)
      .single()
    
    if (userError) {
      console.error('❌ Error fetching user from users table:', userError)
      console.log('This is the issue causing the login problem!')
    } else {
      console.log('✅ Successfully fetched user from users table:', userData)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkAdminMetadata().catch(console.error)
