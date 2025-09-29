export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, admin_notes, approved_by } = await request.json()
    const leaveRequestId = params.id

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be "approved" or "rejected"' 
      }, { status: 400 })
    }

    if (!approved_by) {
      return NextResponse.json({ 
        error: 'approved_by is required' 
      }, { status: 400 })
    }

    // Get the current leave request
    const client = supabaseAdmin || supabase
    const { data: currentRequest, error: fetchError } = await client
      .from('leave_requests')
      .select('*')
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ 
        error: 'Leave request not found' 
      }, { status: 404 })
    }

    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Leave request has already been processed' 
      }, { status: 400 })
    }

    // Update the leave request
    const { data, error } = await client
      .from('leave_requests')
      .update({
        status,
        admin_notes: admin_notes || null,
        approved_by,
        updated_at: new Date().toISOString()
      })
      .eq('id', leaveRequestId)
      .select(`
        *,
        users!leave_requests_driver_id_fkey(name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating leave request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If approved, update attendance records for the leave period
    if (status === 'approved') {
      const startDate = new Date(currentRequest.start_date)
      const endDate = new Date(currentRequest.end_date)
      
      // Create attendance records for each day of leave
      const attendanceRecords = []
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        attendanceRecords.push({
          driver_id: currentRequest.driver_id,
          date: d.toISOString().split('T')[0],
          status: 'leave',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      const { error: attendanceError } = await client
        .from('attendance')
        .upsert(attendanceRecords, { 
          onConflict: 'driver_id,date',
          ignoreDuplicates: false 
        })

      if (attendanceError) {
        console.warn('Error creating attendance records for leave:', attendanceError)
        // Don't fail the entire operation for this
      }
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: `Leave request ${status} successfully` 
    })
  } catch (error: any) {
    console.error('Error in leave-requests PUT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leaveRequestId = params.id

    // Check if the leave request exists and is pending
    const client = supabaseAdmin || supabase
    const { data: currentRequest, error: fetchError } = await client
      .from('leave_requests')
      .select('status')
      .eq('id', leaveRequestId)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ 
        error: 'Leave request not found' 
      }, { status: 404 })
    }

    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Cannot delete processed leave request' 
      }, { status: 400 })
    }

    const { error } = await client
      .from('leave_requests')
      .delete()
      .eq('id', leaveRequestId)

    if (error) {
      console.error('Error deleting leave request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Leave request deleted successfully' 
    })
  } catch (error: any) {
    console.error('Error in leave-requests DELETE:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
