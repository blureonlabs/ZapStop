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

async function checkUserMismatch() {
  console.log('=== Checking User Mismatch ===')
  
  try {
    // Get all users from auth
    console.log('\n1. Getting all auth users...')
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers()
    
    if (authListError) {
      console.error('❌ Error listing auth users:', authListError)
      return
    }
    
    console.log('Auth users found:', authUsers.users.length)
    authUsers.users.forEach(user => {
      console.log(`- ${user.email}: ${user.id}`)
    })
    
    // Get all users from users table
    console.log('\n2. Getting all users from users table...')
    const { data: dbUsers, error: dbUsersError } = await supabase
      .from('users')
      .select('*')
    
    if (dbUsersError) {
      console.error('❌ Error getting users from table:', dbUsersError)
    } else {
      console.log('Users in table:', dbUsers.length)
      dbUsers.forEach(user => {
        console.log(`- ${user.email}: ${user.id}`)
      })
    }
    
    // Check for mismatches
    console.log('\n3. Checking for mismatches...')
    const authUserIds = new Set(authUsers.users.map(u => u.id))
    const dbUserIds = new Set(dbUsers.map(u => u.id))
    
    const authOnly = [...authUserIds].filter(id => !dbUserIds.has(id))
    const dbOnly = [...dbUserIds].filter(id => !authUserIds.has(id))
    
    if (authOnly.length > 0) {
      console.log('❌ Users in auth but not in users table:')
      authOnly.forEach(id => {
        const user = authUsers.users.find(u => u.id === id)
        console.log(`  - ${user.email}: ${id}`)
      })
    }
    
    if (dbOnly.length > 0) {
      console.log('❌ Users in users table but not in auth:')
      dbOnly.forEach(id => {
        const user = dbUsers.find(u => u.id === id)
        console.log(`  - ${user.email}: ${id}`)
      })
    }
    
    if (authOnly.length === 0 && dbOnly.length === 0) {
      console.log('✅ All users match between auth and users table')
    }
    
    // Check the specific user ID that's causing the issue
    const problemUserId = 'f986d298-524b-4be1-b790-0ab7eeec7132'
    console.log(`\n4. Checking specific user ID: ${problemUserId}`)
    
    const authUser = authUsers.users.find(u => u.id === problemUserId)
    const dbUser = dbUsers.find(u => u.id === problemUserId)
    
    console.log('Auth user found:', !!authUser)
    if (authUser) {
      console.log('Auth user email:', authUser.email)
    }
    
    console.log('DB user found:', !!dbUser)
    if (dbUser) {
      console.log('DB user email:', dbUser.email)
    }
    
    // If the user exists in auth but not in DB, create the record
    if (authUser && !dbUser) {
      console.log('\n5. Creating missing user record...')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          name: authUser.user_metadata?.name || 'Unknown User',
          email: authUser.email,
          role: authUser.user_metadata?.role || 'driver',
          phone: authUser.user_metadata?.phone || null,
          assigned_car_id: null
        }])
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Error creating user record:', createError)
      } else {
        console.log('✅ Created user record:', newUser)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkUserMismatch().catch(console.error)
