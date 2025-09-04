import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, role = 'driver', assigned_car_id } = await request.json()
    
    console.log('Creating driver with:', { name, email, role, assigned_car_id })

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin client not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your environment variables.' }, { status: 500 })
    }

    // Create user in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Try to confirm email during creation
      user_metadata: {
        name,
        role
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user in Supabase Auth' }, { status: 500 })
    }

    // Force email confirmation using admin API (works even if confirmations are enabled)
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
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // If a car is assigned, update the cars table
    if (assigned_car_id && assigned_car_id !== 'none') {
      const { error: carError } = await supabaseAdmin
        .from('cars')
        .update({ assigned_driver_id: authData.user.id })
        .eq('id', assigned_car_id)

      if (carError) {
        console.warn('Failed to update car assignment:', carError)
        // Don't fail the entire operation for this
      }
    }

    console.log('Driver created successfully with auto email confirmation:', userData)
    return NextResponse.json({ 
      success: true, 
      user: userData,
      message: 'Driver created successfully. User can login immediately without email confirmation.'
    })
  } catch (error: any) {
    console.error('Error in create-driver:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
