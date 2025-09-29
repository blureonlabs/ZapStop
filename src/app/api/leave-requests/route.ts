export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get('driver_id')
    const status = searchParams.get('status')

    const client = supabaseAdmin || supabase
    let query = client
      .from('leave_requests')
      .select(`
        *,
        users!leave_requests_driver_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false })

    if (driverId) {
      query = query.eq('driver_id', driverId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching leave requests:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in leave-requests GET:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { driver_id, leave_type, start_date, end_date, reason } = await request.json()

    if (!driver_id || !leave_type || !start_date || !end_date || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields: driver_id, leave_type, start_date, end_date, and reason are required' 
      }, { status: 400 })
    }

    // Validate date range
    const start = new Date(start_date)
    const end = new Date(end_date)
    
    if (start > end) {
      return NextResponse.json({ 
        error: 'Start date cannot be after end date' 
      }, { status: 400 })
    }

    if (start < new Date()) {
      return NextResponse.json({ 
        error: 'Cannot request leave for past dates' 
      }, { status: 400 })
    }

    // Check for overlapping leave requests
    const client = supabaseAdmin || supabase
    const { data: existingRequests, error: checkError } = await client
      .from('leave_requests')
      .select('id, start_date, end_date, status')
      .eq('driver_id', driver_id)
      .in('status', ['pending', 'approved'])

    if (checkError) {
      console.error('Error checking existing requests:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    const hasOverlap = existingRequests?.some(req => {
      const reqStart = new Date(req.start_date)
      const reqEnd = new Date(req.end_date)
      return (start <= reqEnd && end >= reqStart)
    })

    if (hasOverlap) {
      return NextResponse.json({ 
        error: 'You already have a pending or approved leave request for this period' 
      }, { status: 400 })
    }

    const { data, error } = await client
      .from('leave_requests')
      .insert([{
        driver_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status: 'pending'
      }])
      .select(`
        *,
        users!leave_requests_driver_id_fkey(name, email)
      `)
      .single()

    if (error) {
      console.error('Error creating leave request:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Leave request submitted successfully' 
    })
  } catch (error: any) {
    console.error('Error in leave-requests POST:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
