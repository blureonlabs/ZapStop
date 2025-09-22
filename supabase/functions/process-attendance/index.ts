import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AttendanceAction {
  action: 'start' | 'end' | 'check_status'
  driver_id: string
  date?: string
}

interface AttendanceResponse {
  success: boolean
  data?: {
    id: string
    driver_id: string
    date: string
    start_time?: string
    end_time?: string
    status: 'present' | 'absent' | 'leave'
    duration?: number // in minutes
  }
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get request body
    const { action, driver_id, date = new Date().toISOString().split('T')[0] }: AttendanceAction = await req.json()

    if (!action || !driver_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: action and driver_id are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const currentTime = new Date().toTimeString().split(' ')[0] // HH:MM:SS format

    if (action === 'start') {
      // Check if attendance record already exists for today
      const { data: existingAttendance, error: checkError } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('driver_id', driver_id)
        .eq('date', date)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Error checking existing attendance: ${checkError.message}`)
      }

      if (existingAttendance) {
        if (existingAttendance.start_time) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Driver has already started work today' 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        } else {
          // Update existing record
          const { data: updatedAttendance, error: updateError } = await supabaseClient
            .from('attendance')
            .update({
              start_time: currentTime,
              status: 'present',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAttendance.id)
            .select()
            .single()

          if (updateError) {
            throw new Error(`Error updating attendance: ${updateError.message}`)
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              data: updatedAttendance 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
      } else {
        // Create new attendance record
        const { data: newAttendance, error: createError } = await supabaseClient
          .from('attendance')
          .insert([{
            driver_id,
            date,
            start_time: currentTime,
            status: 'present'
          }])
          .select()
          .single()

        if (createError) {
          throw new Error(`Error creating attendance: ${createError.message}`)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newAttendance 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
    }

    if (action === 'end') {
      // Find today's attendance record
      const { data: attendance, error: findError } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('driver_id', driver_id)
        .eq('date', date)
        .single()

      if (findError) {
        if (findError.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No attendance record found for today. Please start work first.' 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }
        throw new Error(`Error finding attendance: ${findError.message}`)
      }

      if (!attendance.start_time) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Driver has not started work today' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      if (attendance.end_time) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Driver has already ended work today' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      // Calculate duration
      const startTime = new Date(`2000-01-01T${attendance.start_time}`)
      const endTime = new Date(`2000-01-01T${currentTime}`)
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)) // minutes

      // Update attendance record
      const { data: updatedAttendance, error: updateError } = await supabaseClient
        .from('attendance')
        .update({
          end_time: currentTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendance.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Error updating attendance: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...updatedAttendance,
            duration
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    if (action === 'check_status') {
      // Get today's attendance status
      const { data: attendance, error: findError } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('driver_id', driver_id)
        .eq('date', date)
        .single()

      if (findError && findError.code !== 'PGRST116') {
        throw new Error(`Error finding attendance: ${findError.message}`)
      }

      if (!attendance) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            data: {
              id: '',
              driver_id,
              date,
              status: 'absent' as const
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      // Calculate duration if both start and end times exist
      let duration = undefined
      if (attendance.start_time && attendance.end_time) {
        const startTime = new Date(`2000-01-01T${attendance.start_time}`)
        const endTime = new Date(`2000-01-01T${attendance.end_time}`)
        duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
      } else if (attendance.start_time && !attendance.end_time) {
        // Calculate current duration if still working
        const startTime = new Date(`2000-01-01T${attendance.start_time}`)
        const currentTime = new Date(`2000-01-01T${new Date().toTimeString().split(' ')[0]}`)
        duration = Math.round((currentTime.getTime() - startTime.getTime()) / (1000 * 60))
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...attendance,
            duration
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Invalid action. Must be start, end, or check_status' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )

  } catch (error) {
    console.error('Error in process-attendance:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
