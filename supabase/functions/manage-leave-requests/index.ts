import { serve } from 'https://deno.land/std@0.178.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeaveRequestData {
  driver_id: string
  start_date: string
  end_date: string
  leave_type: 'sick' | 'vacation' | 'personal' | 'emergency' | 'other'
  reason: string
  status?: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
}

interface CreateLeaveRequestRequest {
  action: 'create' | 'update' | 'delete' | 'get' | 'list' | 'approve' | 'reject'
  leaveData?: LeaveRequestData
  leaveId?: string
  approverId?: string
  rejectionReason?: string
  filters?: {
    driver_id?: string
    status?: string
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, leaveData, leaveId, approverId, rejectionReason, filters }: CreateLeaveRequestRequest = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (action) {
      case 'create': {
        if (!leaveData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request data is required for create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate required fields
        if (!leaveData.driver_id || !leaveData.start_date || !leaveData.end_date || !leaveData.leave_type || !leaveData.reason) {
          return new Response(
            JSON.stringify({ success: false, error: 'Driver ID, start date, end date, leave type, and reason are required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate dates
        const startDate = new Date(leaveData.start_date)
        const endDate = new Date(leaveData.end_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (startDate < today) {
          return new Response(
            JSON.stringify({ success: false, error: 'Start date cannot be in the past' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        if (endDate < startDate) {
          return new Response(
            JSON.stringify({ success: false, error: 'End date cannot be before start date' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if driver exists
        const { data: driver } = await supabaseClient
          .from('users')
          .select('id, name, role')
          .eq('id', leaveData.driver_id)
          .eq('role', 'driver')
          .single()

        if (!driver) {
          return new Response(
            JSON.stringify({ success: false, error: 'Driver not found or invalid role' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Check for overlapping leave requests
        const { data: overlappingRequests } = await supabaseClient
          .from('leave_requests')
          .select('id, start_date, end_date, status')
          .eq('driver_id', leaveData.driver_id)
          .in('status', ['pending', 'approved'])
          .or(`and(start_date.lte.${leaveData.end_date},end_date.gte.${leaveData.start_date})`)

        if (overlappingRequests && overlappingRequests.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'You already have a leave request for this period' 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Create leave request
        const { data: newLeaveRequest, error: leaveError } = await supabaseClient
          .from('leave_requests')
          .insert([{
            driver_id: leaveData.driver_id,
            start_date: leaveData.start_date,
            end_date: leaveData.end_date,
            leave_type: leaveData.leave_type,
            reason: leaveData.reason,
            status: leaveData.status || 'pending',
          }])
          .select(`
            *,
            users!leave_requests_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (leaveError) {
          console.error('Error creating leave request:', leaveError)
          return new Response(
            JSON.stringify({ success: false, error: leaveError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newLeaveRequest,
            message: 'Leave request created successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'update': {
        if (!leaveId || !leaveData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request ID and data are required for update action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if leave request exists and is not already processed
        const { data: existingRequest } = await supabaseClient
          .from('leave_requests')
          .select('id, status')
          .eq('id', leaveId)
          .single()

        if (!existingRequest) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingRequest.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot update processed leave request' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Update leave request
        const { data: updatedRequest, error: updateError } = await supabaseClient
          .from('leave_requests')
          .update({
            start_date: leaveData.start_date,
            end_date: leaveData.end_date,
            leave_type: leaveData.leave_type,
            reason: leaveData.reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', leaveId)
          .select(`
            *,
            users!leave_requests_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (updateError) {
          console.error('Error updating leave request:', updateError)
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: updatedRequest,
            message: 'Leave request updated successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'approve': {
        if (!leaveId || !approverId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request ID and approver ID are required for approve action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if leave request exists and is pending
        const { data: existingRequest } = await supabaseClient
          .from('leave_requests')
          .select('id, status, driver_id')
          .eq('id', leaveId)
          .single()

        if (!existingRequest) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingRequest.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request is not pending' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Approve leave request
        const { data: approvedRequest, error: approveError } = await supabaseClient
          .from('leave_requests')
          .update({
            status: 'approved'
          })
          .eq('id', leaveId)
          .select(`
            *,
            users!leave_requests_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (approveError) {
          console.error('Error approving leave request:', approveError)
          return new Response(
            JSON.stringify({ success: false, error: approveError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: approvedRequest,
            message: 'Leave request approved successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'reject': {
        if (!leaveId || !approverId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request ID and approver ID are required for reject action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if leave request exists and is pending
        const { data: existingRequest } = await supabaseClient
          .from('leave_requests')
          .select('id, status')
          .eq('id', leaveId)
          .single()

        if (!existingRequest) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingRequest.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request is not pending' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Reject leave request
        const { data: rejectedRequest, error: rejectError } = await supabaseClient
          .from('leave_requests')
          .update({
            status: 'rejected'
          })
          .eq('id', leaveId)
          .select(`
            *,
            users!leave_requests_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (rejectError) {
          console.error('Error rejecting leave request:', rejectError)
          return new Response(
            JSON.stringify({ success: false, error: rejectError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: rejectedRequest,
            message: 'Leave request rejected successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'delete': {
        if (!leaveId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request ID is required for delete action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if leave request exists and is pending
        const { data: existingRequest } = await supabaseClient
          .from('leave_requests')
          .select('id, status')
          .eq('id', leaveId)
          .single()

        if (!existingRequest) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingRequest.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot delete processed leave request' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Delete leave request
        const { error: deleteError } = await supabaseClient
          .from('leave_requests')
          .delete()
          .eq('id', leaveId)

        if (deleteError) {
          console.error('Error deleting leave request:', deleteError)
          return new Response(
            JSON.stringify({ success: false, error: deleteError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Leave request deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'get': {
        if (!leaveId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Leave request ID is required for get action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Get leave request with driver info
        const { data: leaveRequest, error: leaveError } = await supabaseClient
          .from('leave_requests')
          .select(`
            *,
            users!leave_requests_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .eq('id', leaveId)
          .single()

        if (leaveError) {
          if (leaveError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: 'Leave request not found' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
              }
            )
          }
          console.error('Error fetching leave request:', leaveError)
          return new Response(
            JSON.stringify({ success: false, error: leaveError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: leaveRequest
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'list': {
        // Get all leave requests with driver info
        let query = supabaseClient
          .from('leave_requests')
          .select(`
            *,
            users!leave_requests_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .order('created_at', { ascending: false })

        // Apply filters
        if (filters?.driver_id) {
          query = query.eq('driver_id', filters.driver_id)
        }

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        if (filters?.start_date) {
          query = query.gte('start_date', filters.start_date)
        }

        if (filters?.end_date) {
          query = query.lte('end_date', filters.end_date)
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }

        const { data: leaveRequests, error: leaveError } = await query

        if (leaveError) {
          console.error('Error fetching leave requests:', leaveError)
          return new Response(
            JSON.stringify({ success: false, error: leaveError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: leaveRequests || []
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
    }
  } catch (error) {
    console.error('Error in manage-leave-requests Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
