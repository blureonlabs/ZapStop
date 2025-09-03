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

async function checkAndFixUsers() {
  console.log('Checking and fixing demo users...')
  
  for (const user of demoUsers) {
    try {
      console.log(`\nChecking user: ${user.email}`)
      
      // Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.error(`Error checking user ${user.email}:`, userError)
        continue
      }

      if (userData) {
        console.log(`✅ User exists in users table: ${user.email}`)
        
        // Try to get user from auth
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
        
        if (authError) {
          console.error(`Error listing auth users:`, authError)
          continue
        }

        const authUser = authUsers.users.find(u => u.email === user.email)
        
        if (authUser) {
          console.log(`✅ User exists in auth: ${user.email}`)
          console.log(`   Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`)
          
          if (!authUser.email_confirmed_at) {
            console.log(`   🔧 Confirming email for ${user.email}...`)
            const { error: confirmError } = await supabase.auth.admin.updateUserById(authUser.id, {
              email_confirm: true
            })
            
            if (confirmError) {
              console.error(`   ❌ Error confirming email:`, confirmError)
            } else {
              console.log(`   ✅ Email confirmed for ${user.email}`)
            }
          }
        } else {
          console.log(`❌ User missing from auth, creating...`)
          
          // Create user in auth
          const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              name: user.name,
              role: user.role
            }
          })

          if (authCreateError) {
            console.error(`   ❌ Error creating auth user:`, authCreateError)
          } else {
            console.log(`   ✅ Created auth user: ${user.email}`)
            
            // Update users table with correct auth ID
            const { error: updateError } = await supabase
              .from('users')
              .update({ id: authData.user.id })
              .eq('email', user.email)

            if (updateError) {
              console.error(`   ❌ Error updating user ID:`, updateError)
            } else {
              console.log(`   ✅ Updated user ID in users table`)
            }
          }
        }
      } else {
        console.log(`❌ User missing from users table: ${user.email}`)
        // This case is handled by the setup script
      }
    } catch (error) {
      console.error(`❌ Error processing user ${user.email}:`, error.message)
    }
  }
  
  console.log('\n✅ User check and fix complete!')
}

checkAndFixUsers().catch(console.error)
