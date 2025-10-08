export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function PUT(request: NextRequest) {
  try {
    const { name, phone } = await request.json()
    
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

    // Validate input
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Update user in users table
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        phone: phone?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()

    if (userError) {
      console.error('User update error:', userError)
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }

    // Update user metadata in Supabase Auth
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        name: name.trim()
      }
    })

    if (authUpdateError) {
      console.error('Auth metadata update error:', authUpdateError)
    }

    return NextResponse.json({ 
      success: true, 
      user: updatedUser
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

