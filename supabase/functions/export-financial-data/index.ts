import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  type: 'earnings' | 'expenses' | 'attendance' | 'all'
  format: 'csv' | 'json'
  dateFrom: string
  dateTo: string
  driverId?: string
}

function generateCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',')
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  )
  return [csvHeaders, ...csvRows].join('\n')
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
    const { type, format, dateFrom, dateTo, driverId }: ExportRequest = await req.json()

    if (!type || !format || !dateFrom || !dateTo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: type, format, dateFrom, and dateTo are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    let data: any[] = []
    let filename = ''

    if (type === 'earnings' || type === 'all') {
      let query = supabaseClient
        .from('driver_earnings')
        .select(`
          *,
          users!inner(name, email)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      if (driverId) {
        query = query.eq('driver_id', driverId)
      }

      const { data: earnings, error: earningsError } = await query

      if (earningsError) {
        throw new Error(`Error fetching earnings: ${earningsError.message}`)
      }

      if (type === 'earnings') {
        data = earnings?.map(earning => ({
          date: earning.date,
          driver_name: earning.users?.name || 'Unknown',
          driver_email: earning.users?.email || 'Unknown',
          uber_cash: earning.uber_cash,
          uber_account: earning.uber_account,
          bolt_cash: earning.bolt_cash,
          bolt_account: earning.bolt_account,
          individual_rides_cash: earning.individual_rides_cash,
          individual_rides_account: earning.individual_rides_account,
          total_earnings: earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account,
          notes: earning.notes || '',
          created_at: earning.created_at
        })) || []
        filename = `earnings_${dateFrom}_to_${dateTo}.${format}`
      }
    }

    if (type === 'expenses' || type === 'all') {
      let query = supabaseClient
        .from('driver_expenses')
        .select(`
          *,
          users!inner(name, email)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      if (driverId) {
        query = query.eq('driver_id', driverId)
      }

      const { data: expenses, error: expensesError } = await query

      if (expensesError) {
        throw new Error(`Error fetching expenses: ${expensesError.message}`)
      }

      if (type === 'expenses') {
        data = expenses?.map(expense => ({
          date: expense.date,
          driver_name: expense.users?.name || 'Unknown',
          driver_email: expense.users?.email || 'Unknown',
          expense_type: expense.expense_type,
          amount: expense.amount,
          description: expense.description || '',
          status: expense.status,
          proof_url: expense.proof_url || '',
          created_at: expense.created_at
        })) || []
        filename = `expenses_${dateFrom}_to_${dateTo}.${format}`
      }
    }

    if (type === 'attendance' || type === 'all') {
      let query = supabaseClient
        .from('attendance')
        .select(`
          *,
          users!inner(name, email)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      if (driverId) {
        query = query.eq('driver_id', driverId)
      }

      const { data: attendance, error: attendanceError } = await query

      if (attendanceError) {
        throw new Error(`Error fetching attendance: ${attendanceError.message}`)
      }

      if (type === 'attendance') {
        data = attendance?.map(record => {
          let duration = 0
          if (record.start_time && record.end_time) {
            const startTime = new Date(`2000-01-01T${record.start_time}`)
            const endTime = new Date(`2000-01-01T${record.end_time}`)
            duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
          } else if (record.start_time && !record.end_time) {
            // Calculate current duration if still working
            const startTime = new Date(`2000-01-01T${record.start_time}`)
            const currentTime = new Date(`2000-01-01T${new Date().toTimeString().split(' ')[0]}`)
            duration = Math.round((currentTime.getTime() - startTime.getTime()) / (1000 * 60))
          }

          return {
            date: record.date,
            driver_name: record.users?.name || 'Unknown',
            driver_email: record.users?.email || 'Unknown',
            start_time: record.start_time || '',
            end_time: record.end_time || '',
            status: record.status,
            duration_minutes: duration,
            created_at: record.created_at
          }
        }) || []
        filename = `attendance_${dateFrom}_to_${dateTo}.${format}`
      }
    }

    if (type === 'all') {
      // Combine all data types
      const { data: earnings } = await supabaseClient
        .from('driver_earnings')
        .select(`
          *,
          users!inner(name, email)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      const { data: expenses } = await supabaseClient
        .from('driver_expenses')
        .select(`
          *,
          users!inner(name, email)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      const { data: attendance } = await supabaseClient
        .from('attendance')
        .select(`
          *,
          users!inner(name, email)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      data = {
        earnings: earnings?.map(earning => ({
          date: earning.date,
          driver_name: earning.users?.name || 'Unknown',
          driver_email: earning.users?.email || 'Unknown',
          uber_cash: earning.uber_cash,
          uber_account: earning.uber_account,
          bolt_cash: earning.bolt_cash,
          bolt_account: earning.bolt_account,
          individual_rides_cash: earning.individual_rides_cash,
          individual_rides_account: earning.individual_rides_account,
          total_earnings: earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account,
          notes: earning.notes || ''
        })) || [],
        expenses: expenses?.map(expense => ({
          date: expense.date,
          driver_name: expense.users?.name || 'Unknown',
          driver_email: expense.users?.email || 'Unknown',
          expense_type: expense.expense_type,
          amount: expense.amount,
          description: expense.description || '',
          status: expense.status
        })) || [],
        attendance: attendance?.map(record => ({
          date: record.date,
          driver_name: record.users?.name || 'Unknown',
          driver_email: record.users?.email || 'Unknown',
          start_time: record.start_time || '',
          end_time: record.end_time || '',
          status: record.status
        })) || []
      }
      filename = `financial_data_${dateFrom}_to_${dateTo}.${format}`
    }

    if (format === 'csv' && type !== 'all') {
      const headers = Object.keys(data[0] || {})
      const csvContent = generateCSV(data, headers)
      
      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`
        },
        status: 200,
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        filename,
        count: Array.isArray(data) ? data.length : Object.keys(data).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in export-financial-data:', error)
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
