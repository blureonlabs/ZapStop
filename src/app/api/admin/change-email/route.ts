export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer, supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const { userId, newEmail } = await request.json()
    
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

    console.log('Admin user changing email for user:', userId)

    // Validate input
    if (!userId || !newEmail) {
      return NextResponse.json({ error: 'User ID and new email are required' }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Verify the target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      console.error('Target user not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if new email is already in use by another user
    const { data: existingUser, error: emailCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .neq('id', userId)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Email is already in use by another user' }, { status: 400 })
    }

    // Use Supabase Admin API to update the email
    if (!supabaseAdmin) {
      console.error('Supabase admin client not available - missing service role key')
      return NextResponse.json({ error: 'Admin service not available' }, { status: 500 })
    }

    // Update email using admin privileges
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true // Auto-confirm the email change
    })

    if (updateError) {
      console.error('Email update error:', updateError)
      return NextResponse.json({ error: 'Failed to update email' }, { status: 500 })
    }

    // Update the email in the users table
    const { error: dbUpdateError } = await supabase
      .from('users')
      .update({
        email: newEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (dbUpdateError) {
      console.error('Failed to update email in users table:', dbUpdateError)
      // Don't fail the entire operation for this, but log it
    }

    // If the user is an owner, also update the owners table
    if (targetUser.role === 'owner') {
      const { error: ownersUpdateError } = await supabase
        .from('owners')
        .update({
          email: newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (ownersUpdateError) {
        console.error('Failed to update email in owners table:', ownersUpdateError)
        // Don't fail the entire operation for this, but log it
      } else {
        console.log(`Updated email in owners table for owner ${targetUser.name}`)
      }
    }

    console.log(`Admin ${adminUser.id} successfully changed email for user ${targetUser.name} from ${targetUser.email} to ${newEmail}`)

    return NextResponse.json({ 
      success: true,
      message: `Email updated successfully for ${targetUser.name}`,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        oldEmail: targetUser.email,
        newEmail: newEmail,
        role: targetUser.role
      }
    })

  } catch (error) {
    console.error('Admin email change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
