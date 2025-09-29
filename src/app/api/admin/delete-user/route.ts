export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Admin access not available' }, { status: 503 })
    }

    // First, unassign any cars assigned to this driver
    const { error: unassignError } = await supabaseAdmin
      .from('cars')
      .update({ assigned_driver_id: null })
      .eq('assigned_driver_id', userId)

    if (unassignError) {
      console.warn('Could not unassign cars:', unassignError)
      // Continue anyway, but log the warning
    }

    // Delete from users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (userError) {
      throw userError
    }

    // Delete from auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.warn('Could not delete from auth:', authError)
      // Continue anyway as the user record is deleted
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
