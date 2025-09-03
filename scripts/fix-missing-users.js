const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixMissingUsers() {
  console.log('=== Fixing Missing Users ===')
  
  try {
    // Get all users from auth
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()
    
    if (authListError) {
      console.error('❌ Error listing auth users:', authListError)
      return
    }
    
    // Get all users from users table
    const { data: dbUsers, error: dbUsersError } = await supabase
      .from('users')
      .select('*')
    
    if (dbUsersError) {
      console.error('❌ Error getting users from table:', dbUsersError)
      return
    }
    
    const dbUserIds = new Set(dbUsers.map(u => u.id))
    
    // Find users that exist in auth but not in users table
    const missingUsers = authUsers.users.filter(user => !dbUserIds.has(user.id))
    
    console.log(`Found ${missingUsers.length} missing users:`)
    
    for (const authUser of missingUsers) {
      console.log(`\nCreating user record for: ${authUser.email}`)
      
      // Determine role based on email
      let role = 'driver'
      if (authUser.email.includes('admin')) {
        role = 'admin'
      } else if (authUser.email.includes('accountant')) {
        role = 'accountant'
      }
      
      // Get name from user metadata or use email
      const name = authUser.user_metadata?.name || authUser.email.split('@')[0]
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          name: name,
          email: authUser.email,
          role: role,
          phone: authUser.user_metadata?.phone || null,
          assigned_car_id: null
        }])
        .select()
        .single()
      
      if (createError) {
        console.error(`❌ Error creating user record for ${authUser.email}:`, createError)
      } else {
        console.log(`✅ Created user record:`, newUser)
      }
    }
    
    // Update the admin@gmail.com user to have admin role
    console.log('\n=== Updating admin@gmail.com role ===')
    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update({ role: 'admin' })
      .eq('email', 'admin@gmail.com')
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error updating admin role:', updateError)
    } else {
      console.log('✅ Updated admin role:', updateData)
    }
    
    // Update user metadata for admin@gmail.com
    console.log('\n=== Updating admin@gmail.com metadata ===')
    const adminUser = authUsers.users.find(u => u.email === 'admin@gmail.com')
    if (adminUser) {
      const { data: updateMetadata, error: metadataError } = await supabase.auth.admin.updateUserById(
        adminUser.id,
        {
          user_metadata: {
            ...adminUser.user_metadata,
            role: 'admin',
            name: 'Admin User'
          }
        }
      )
      
      if (metadataError) {
        console.error('❌ Error updating user metadata:', metadataError)
      } else {
        console.log('✅ Updated user metadata:', updateMetadata.user.user_metadata)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixMissingUsers().catch(console.error)
