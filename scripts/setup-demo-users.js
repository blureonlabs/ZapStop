const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const demoUsers = [
  {
    email: 'admin@zapstop.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'accountant@zapstop.com',
    password: 'accountant123',
    name: 'Accountant User',
    role: 'accountant'
  },
  {
    email: 'driver1@zapstop.com',
    password: 'driver123',
    name: 'Driver 1',
    role: 'driver'
  }
]

async function setupDemoUsers() {
  console.log('Setting up demo users...')
  
  for (const user of demoUsers) {
    try {
      console.log(`Creating user: ${user.email}`)
      
      // Create user in Supabase Auth with auto email confirmation
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto confirm email
        user_metadata: {
          name: user.name,
          role: user.role
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`User ${user.email} already exists, skipping...`)
          continue
        }
        throw authError
      }

      // Create user record in users table
      const { error: userError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: null,
          assigned_car_id: null
        }])

      if (userError) {
        console.error(`Error creating user record for ${user.email}:`, userError)
        // Clean up auth user if user record creation fails
        await supabase.auth.admin.deleteUser(authData.user.id)
        continue
      }

      console.log(`✅ Successfully created user: ${user.email} (${user.role})`)
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message)
    }
  }
  
  console.log('Demo users setup complete!')
}

setupDemoUsers().catch(console.error)
