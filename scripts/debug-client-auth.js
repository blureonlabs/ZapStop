const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugClientAuth() {
  console.log('=== Debugging Client-Side Authentication ===')
  
  try {
    // Step 1: Sign in as admin
    console.log('\n1. Signing in as admin...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'admin@zapstop.com',
      password: 'admin123'
    })
    
    if (signInError) {
      console.error('❌ Sign in error:', signInError)
      return
    }
    
    console.log('✅ Signed in successfully')
    console.log('User ID:', signInData.user.id)
    console.log('User metadata:', signInData.user.user_metadata)
    
    // Step 2: Check current session
    console.log('\n2. Checking current session...')
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError)
    } else {
      console.log('✅ Session retrieved')
      console.log('Session user:', sessionData.session?.user?.id)
    }
    
    // Step 3: Try to fetch user from users table (this is what's failing)
    console.log('\n3. Attempting to fetch user from users table...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', signInData.user.id)
      .single()
    
    if (userError) {
      console.error('❌ Error fetching user from users table:')
      console.error('Error code:', userError.code)
      console.error('Error message:', userError.message)
      console.error('Error details:', userError.details)
      console.error('Error hint:', userError.hint)
      console.error('Full error:', JSON.stringify(userError, null, 2))
      
      // Let's check what RLS policies are actually in effect
      console.log('\n4. Checking RLS policies...')
      
      // Try a simple query to see what happens
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      if (allUsersError) {
        console.error('❌ Error querying users table (any user):', allUsersError.message)
      } else {
        console.log('✅ Successfully queried users table:', allUsers)
      }
      
    } else {
      console.log('✅ Successfully fetched user from users table:', userData)
    }
    
    // Step 4: Check JWT token details
    console.log('\n5. Checking JWT token details...')
    const token = sessionData.session?.access_token
    if (token) {
      try {
        // Decode JWT payload (without verification for debugging)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        console.log('JWT payload:', JSON.stringify(payload, null, 2))
      } catch (e) {
        console.log('Could not decode JWT token')
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugClientAuth().catch(console.error)
