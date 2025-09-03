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

async function applyRLSFixDirect() {
  console.log('=== Applying RLS Fix Directly ===')
  
  try {
    // First, let's test the current state with anon key
    console.log('\n1. Testing current state with anon key...')
    const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Sign in as admin
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: 'admin@zapstop.com',
      password: 'admin123'
    })
    
    if (signInError) {
      console.error('❌ Sign in error:', signInError)
      return
    }
    
    console.log('✅ Signed in successfully')
    
    // Try to query users table
    const { data: userData, error: userError } = await anonSupabase
      .from('users')
      .select('*')
      .eq('id', signInData.user.id)
      .single()
    
    if (userError) {
      console.error('❌ Error querying users table:', userError.message)
      console.log('This confirms the RLS issue exists')
      
      // Now let's try to fix it by updating the user metadata
      console.log('\n2. Attempting to fix by updating user metadata...')
      
      // Use service role to update the user's metadata
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        signInData.user.id,
        {
          user_metadata: {
            email_verified: true,
            name: 'Admin User',
            role: 'admin'
          }
        }
      )
      
      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError)
      } else {
        console.log('✅ Updated user metadata:', updateData.user.user_metadata)
        
        // Sign out and sign back in to get fresh token
        await anonSupabase.auth.signOut()
        
        const { data: newSignInData, error: newSignInError } = await anonSupabase.auth.signInWithPassword({
          email: 'admin@zapstop.com',
          password: 'admin123'
        })
        
        if (newSignInError) {
          console.error('❌ Re-sign in error:', newSignInError)
        } else {
          console.log('✅ Re-signed in successfully')
          console.log('New user metadata:', newSignInData.user.user_metadata)
          
          // Try querying again
          const { data: newUserData, error: newUserError } = await anonSupabase
            .from('users')
            .select('*')
            .eq('id', newSignInData.user.id)
            .single()
          
          if (newUserError) {
            console.error('❌ Still getting error after metadata update:', newUserError.message)
          } else {
            console.log('✅ Successfully queried users table after metadata update:', newUserData)
          }
        }
      }
      
    } else {
      console.log('✅ Users table query successful:', userData)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

applyRLSFixDirect().catch(console.error)
