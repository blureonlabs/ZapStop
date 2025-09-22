import { serve } from 'https://deno.land/std@0.178.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EarningData {
  driver_id: string
  date: string
  uber_cash: number
  uber_account: number
  bolt_cash: number
  bolt_account: number
  individual_cash: number
  individual_rides_cash?: number
  individual_rides_account?: number
  notes?: string
}

interface CreateEarningRequest {
  action: 'create' | 'update' | 'delete' | 'get' | 'list' | 'bulk_create'
  earningData?: EarningData
  earningId?: string
  earningsData?: EarningData[]
  filters?: {
    driver_id?: string
    start_date?: string
    end_date?: string
    platform?: 'uber' | 'bolt' | 'individual'
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
    const { action, earningData, earningId, earningsData, filters }: CreateEarningRequest = await req.json()

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
        if (!earningData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earning data is required for create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate required fields
        if (!earningData.driver_id || !earningData.date) {
          return new Response(
            JSON.stringify({ success: false, error: 'Driver ID and date are required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate that at least one earning amount is provided
        const totalEarnings = (earningData.uber_cash || 0) + 
                            (earningData.uber_account || 0) + 
                            (earningData.bolt_cash || 0) + 
                            (earningData.bolt_account || 0) + 
                            (earningData.individual_cash || 0) +
                            (earningData.individual_rides_cash || 0) +
                            (earningData.individual_rides_account || 0)

        if (totalEarnings <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'At least one earning amount must be greater than 0' }),
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
          .eq('id', earningData.driver_id)
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

        // Check if earning for this driver and date already exists
        const { data: existingEarning } = await supabaseClient
          .from('driver_earnings')
          .select('id')
          .eq('driver_id', earningData.driver_id)
          .eq('date', earningData.date)
          .single()

        if (existingEarning) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earning record for this driver and date already exists' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Create earning
        const { data: newEarning, error: earningError } = await supabaseClient
          .from('driver_earnings')
          .insert([{
            driver_id: earningData.driver_id,
            date: earningData.date,
            uber_cash: earningData.uber_cash || 0,
            uber_account: earningData.uber_account || 0,
            bolt_cash: earningData.bolt_cash || 0,
            bolt_account: earningData.bolt_account || 0,
            individual_cash: earningData.individual_cash || 0,
            individual_rides_cash: earningData.individual_rides_cash || 0,
            individual_rides_account: earningData.individual_rides_account || 0,
            notes: earningData.notes || null,
          }])
          .select(`
            *,
            users!driver_earnings_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (earningError) {
          console.error('Error creating earning:', earningError)
          return new Response(
            JSON.stringify({ success: false, error: earningError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newEarning,
            message: 'Earning created successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'bulk_create': {
        if (!earningsData || !Array.isArray(earningsData) || earningsData.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earnings data array is required for bulk_create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate all earnings data
        for (const earning of earningsData) {
          if (!earning.driver_id || !earning.date) {
            return new Response(
              JSON.stringify({ success: false, error: 'All earnings must have driver_id and date' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
              }
            )
          }
        }

        // Create all earnings
        const earningsToInsert = earningsData.map(earning => ({
          driver_id: earning.driver_id,
          date: earning.date,
          uber_cash: earning.uber_cash || 0,
          uber_account: earning.uber_account || 0,
          bolt_cash: earning.bolt_cash || 0,
          bolt_account: earning.bolt_account || 0,
          individual_cash: earning.individual_cash || 0,
          individual_rides_cash: earning.individual_rides_cash || 0,
          individual_rides_account: earning.individual_rides_account || 0,
          notes: earning.notes || null,
        }))

        const { data: newEarnings, error: earningsError } = await supabaseClient
          .from('driver_earnings')
          .insert(earningsToInsert)
          .select(`
            *,
            users!driver_earnings_driver_id_fkey (
              id,
              name,
              email
            )
          `)

        if (earningsError) {
          console.error('Error creating earnings:', earningsError)
          return new Response(
            JSON.stringify({ success: false, error: earningsError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newEarnings,
            message: `${newEarnings.length} earnings created successfully`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'update': {
        if (!earningId || !earningData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earning ID and data are required for update action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if earning exists
        const { data: existingEarning } = await supabaseClient
          .from('driver_earnings')
          .select('id')
          .eq('id', earningId)
          .single()

        if (!existingEarning) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earning not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Update earning
        const { data: updatedEarning, error: updateError } = await supabaseClient
          .from('driver_earnings')
          .update({
            date: earningData.date,
            uber_cash: earningData.uber_cash || 0,
            uber_account: earningData.uber_account || 0,
            bolt_cash: earningData.bolt_cash || 0,
            bolt_account: earningData.bolt_account || 0,
            individual_cash: earningData.individual_cash || 0,
            individual_rides_cash: earningData.individual_rides_cash || 0,
            individual_rides_account: earningData.individual_rides_account || 0,
            notes: earningData.notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', earningId)
          .select(`
            *,
            users!driver_earnings_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (updateError) {
          console.error('Error updating earning:', updateError)
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
            data: updatedEarning,
            message: 'Earning updated successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'delete': {
        if (!earningId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earning ID is required for delete action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Delete earning
        const { error: deleteError } = await supabaseClient
          .from('driver_earnings')
          .delete()
          .eq('id', earningId)

        if (deleteError) {
          console.error('Error deleting earning:', deleteError)
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
            message: 'Earning deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'get': {
        if (!earningId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Earning ID is required for get action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Get earning with driver info
        const { data: earning, error: earningError } = await supabaseClient
          .from('driver_earnings')
          .select(`
            *,
            users!driver_earnings_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .eq('id', earningId)
          .single()

        if (earningError) {
          if (earningError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: 'Earning not found' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
              }
            )
          }
          console.error('Error fetching earning:', earningError)
          return new Response(
            JSON.stringify({ success: false, error: earningError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: earning
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'list': {
        // Get all earnings with driver info
        let query = supabaseClient
          .from('driver_earnings')
          .select(`
            *,
            users!driver_earnings_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .order('date', { ascending: false })

        // Apply filters
        if (filters?.driver_id) {
          query = query.eq('driver_id', filters.driver_id)
        }

        if (filters?.start_date) {
          query = query.gte('date', filters.start_date)
        }

        if (filters?.end_date) {
          query = query.lte('date', filters.end_date)
        }

        if (filters?.platform) {
          switch (filters.platform) {
            case 'uber':
              query = query.or('uber_cash.gt.0,uber_account.gt.0')
              break
            case 'bolt':
              query = query.or('bolt_cash.gt.0,bolt_account.gt.0')
              break
            case 'individual':
              query = query.or('individual_cash.gt.0,individual_rides_cash.gt.0,individual_rides_account.gt.0')
              break
          }
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }

        const { data: earnings, error: earningsError } = await query

        if (earningsError) {
          console.error('Error fetching earnings:', earningsError)
          return new Response(
            JSON.stringify({ success: false, error: earningsError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: earnings || []
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
    console.error('Error in manage-earnings Edge Function:', error)
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
