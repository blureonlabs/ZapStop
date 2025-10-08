export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { newEmail } = await request.json()
    
    if (!newEmail) {
      return NextResponse.json({ error: 'New email is required' }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Create server-side Supabase client with proper cookie handling
    const cookieStore = await cookies()
    const supabase = createSupabaseServer({
      getAll: () => cookieStore.getAll().map(c => ({ name: c.name, value: c.value })),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== EMAIL CHANGE REQUEST ===')
    console.log('User ID:', user.id)
    console.log('Current Email:', user.email)
    console.log('New Email:', newEmail)
    console.log('============================')

    // Check if new email is already in use
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .neq('id', user.id)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use' }, { status: 400 })
    }

    // Update email in Supabase Auth (this will send confirmation email)
    const { error: updateError } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (updateError) {
      console.error('Email update error:', updateError)
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
    }

    // Note: Email will be updated in users table AFTER confirmation
    // The user will receive a confirmation email at the new address
    // Only after clicking the confirmation link will the email be fully changed

    console.log('✅ Email change request sent for user:', user.id)

    return NextResponse.json({ 
      success: true,
      message: 'Email change request sent. Please check your new email for confirmation.',
      requiresConfirmation: true,
      newEmail
    })

  } catch (error) {
    console.error('Email change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

