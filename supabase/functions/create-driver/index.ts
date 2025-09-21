import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateDriverRequest {
  name: string
  email: string
  password: string
  phone?: string
  role?: 'admin' | 'accountant' | 'driver'
  assigned_car_id?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get request body
    const { name, email, password, phone, role = 'driver', assigned_car_id }: CreateDriverRequest = await req.json()

    // Validate required fields
    if (!name || !email || !password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name, email, and password are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!['admin', 'accountant', 'driver'].includes(role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid role. Must be admin, accountant, or driver' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    console.log('Creating user with:', { name, email, role, assigned_car_id })

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to validate email address' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'A user with this email already exists in the system' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role
      },
      app_metadata: {
        role
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'A user with this email already exists' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create user in Supabase Auth' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    // Force email confirmation using admin API
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(authData.user.id, {
      email_confirm: true
    })

    if (confirmError) {
      console.warn('Failed to confirm email, but user was created:', confirmError)
      // Don't fail the entire operation for this
    }

    // Create user record in users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        name,
        email,
        phone: phone || null,
        role,
        assigned_car_id: assigned_car_id === 'none' ? null : assigned_car_id || null
      }])
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      // If user record creation fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userError.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    // If a car is assigned (only for drivers), update the cars table
    if (role === 'driver' && assigned_car_id && assigned_car_id !== 'none') {
      const { error: carError } = await supabaseAdmin
        .from('cars')
        .update({ assigned_driver_id: authData.user.id })
        .eq('id', assigned_car_id)

      if (carError) {
        console.warn('Failed to update car assignment:', carError)
        // Don't fail the entire operation for this
      }
    }

    console.log('User created successfully with auto email confirmation:', userData)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userData,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} created successfully. User can login immediately without email confirmation.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in create-driver:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
