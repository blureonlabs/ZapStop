export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer, supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json()
    
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
    
    // Get the current user (admin) from Supabase Auth
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !adminUser) {
      console.error('Admin auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the admin user has admin role
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminError || !adminData || adminData.role !== 'admin') {
      console.error('Admin role verification failed:', adminError)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('Admin user changing password for user:', userId)

    // Validate input
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      console.error('Target user not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use Supabase Admin API to update the password
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available - missing service role key')
      return NextResponse.json({ error: 'Admin service not available' }, { status: 500 })
    }

    // Update password using admin privileges
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
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
      .eq('id', userId)

    if (timestampError) {
      console.error('Failed to update password timestamp:', timestampError)
      // Don't fail the entire operation for this
    }

    console.log(`Admin ${adminUser.id} successfully changed password for user ${targetUser.name} (${targetUser.email})`)

    return NextResponse.json({ 
      success: true,
      message: `Password updated successfully for ${targetUser.name}`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email
      }
    })

  } catch (error) {
    console.error('Admin password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
