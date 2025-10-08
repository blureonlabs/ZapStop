export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()
    
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
    
    // Get the current user from Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Authenticated user for password change:', user.id)

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    })

    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    // Update the password_updated_at timestamp in the users table
    const { error: timestampError } = await supabase
      .from('users')
      .update({
        password_updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (timestampError) {
      console.error('Failed to update password timestamp:', timestampError)
      // Don't fail the entire operation for this
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

