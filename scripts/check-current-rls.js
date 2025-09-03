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

async function checkCurrentRLS() {
  console.log('=== Checking Current RLS Policies ===')
  
  try {
    // Query the information_schema to see what policies exist
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'users')
    
    if (policiesError) {
      console.error('❌ Error fetching policies:', policiesError)
    } else {
      console.log('Current RLS policies on users table:')
      policies.forEach(policy => {
        console.log(`- ${policy.policyname}: ${policy.cmd} - ${policy.qual}`)
      })
    }
    
    // Check if RLS is enabled
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relrowsecurity')
      .eq('relname', 'users')
    
    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError)
    } else {
      console.log('RLS enabled on users table:', rlsStatus[0]?.relrowsecurity)
    }
    
    // Test the policies with a service role query
    console.log('\n=== Testing with Service Role ===')
    const { data: serviceData, error: serviceError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@zapstop.com')
      .single()
    
    if (serviceError) {
      console.error('❌ Service role query failed:', serviceError)
    } else {
      console.log('✅ Service role query successful:', serviceData)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkCurrentRLS().catch(console.error)
