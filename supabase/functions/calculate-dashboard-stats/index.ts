import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DashboardStats {
  companyStats: {
    totalCars: number
    totalOwners: number
    totalActiveDrivers: number
    totalMandatoryDues: number
    totalEarnings: number
    totalExpenses: number
    netProfit: number
  }
  carLevelPL: Array<{
    car: string
    earnings: number
    expenses: number
    net: number
    due: number
  }>
  driverLevelPL: Array<{
    driver: string
    earnings: number
    expenses: number
    net: number
  }>
  earningsByPlatform: Array<{
    name: string
    value: number
    color: string
  }>
  earningsByDate: Array<{
    date: string
    uber: number
    bolt: number
    individual: number
    total: number
  }>
  expensesByType: Array<{
    type: string
    amount: number
    count: number
  }>
}

function formatDateLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDateRange(timeFilter: string) {
  const now = new Date()
  const start = new Date()

  switch (timeFilter) {
    case 'daily':
      start.setDate(now.getDate() - 1)
      break
    case 'weekly':
      start.setDate(now.getDate() - 7)
      break
    case 'monthly':
      start.setMonth(now.getMonth() - 1)
      break
    case '3months':
      start.setMonth(now.getMonth() - 3)
      break
    case '6months':
      start.setMonth(now.getMonth() - 6)
      break
    case 'yearly':
      start.setFullYear(now.getFullYear() - 1)
      break
    default:
      start.setMonth(now.getMonth() - 1)
  }

  return {
    start: formatDateLocal(start),
    end: formatDateLocal(now)
  }
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
    const body = await req.json()
    const { timeFilter = 'monthly', startDate, endDate } = body || {}

    // Get date range - prefer explicit start/end if provided
    const dateRange = (startDate && endDate)
      ? { start: String(startDate), end: String(endDate) }
      : getDateRange(timeFilter)

    console.log('calculate-dashboard-stats dateRange =>', dateRange)

    // Fetch all required data in parallel
    const [
      { data: drivers, error: driversError },
      { data: cars, error: carsError },
      { data: owners, error: ownersError },
      { data: earnings, error: earningsError },
      { data: expenses, error: expensesError },
      { data: attendance, error: attendanceError }
    ] = await Promise.all([
      supabaseClient.from('users').select('id, name, assigned_car_id, role').eq('role', 'driver'),
      supabaseClient.from('cars').select('id, plate_number, monthly_due, assigned_driver_id'),
      supabaseClient.from('owners').select('id'),
      supabaseClient
        .from('driver_earnings')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end),
      supabaseClient
        .from('driver_expenses')
        .select('*')
        .eq('status', 'approved')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end),
      supabaseClient
        .from('attendance')
        .select('*')
        .eq('date', formatDateLocal(new Date()))
    ])

    // Check for errors
    if (driversError) throw new Error(`Drivers error: ${driversError.message}`)
    if (carsError) throw new Error(`Cars error: ${carsError.message}`)
    if (ownersError) throw new Error(`Owners error: ${ownersError.message}`)
    if (earningsError) throw new Error(`Earnings error: ${earningsError.message}`)
    if (expensesError) throw new Error(`Expenses error: ${expensesError.message}`)
    if (attendanceError) throw new Error(`Attendance error: ${attendanceError.message}`)

    // Calculate company stats
    const totalCars = cars?.length || 0
    const totalOwners = owners?.length || 0
    const totalActiveDrivers = attendance?.filter(a => a.start_time && !a.end_time).length || 0
    
    const totalMandatoryDues = totalCars * 7500
    const totalEarnings = earnings?.reduce((sum, e) => 
      sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0) || 0
    const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const netProfit = totalEarnings - totalMandatoryDues - totalExpenses

    // Calculate car-level P&L
    const carLevelPL = cars?.map(car => {
      const carEarnings = earnings?.filter(e => {
        const driver = drivers?.find(d => d.id === e.driver_id)
        return driver?.assigned_car_id === car.id
      }).reduce((sum, e) => 
        sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0) || 0
      
      const carExpenses = expenses?.filter(e => {
        const driver = drivers?.find(d => d.id === e.driver_id)
        return driver?.assigned_car_id === car.id
      }).reduce((sum, e) => sum + e.amount, 0) || 0

      return {
        car: car.plate_number,
        earnings: carEarnings,
        expenses: carExpenses,
        net: carEarnings - carExpenses,
        due: car.monthly_due
      }
    }) || []

    // Calculate driver-level P&L
    const driverLevelPL = drivers?.map(driver => {
      const driverEarnings = earnings?.filter(e => e.driver_id === driver.id)
        .reduce((sum, e) => 
          sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0) || 0
      
      const driverExpenses = expenses?.filter(e => e.driver_id === driver.id)
        .reduce((sum, e) => sum + e.amount, 0) || 0

      return {
        driver: driver.name,
        earnings: driverEarnings,
        expenses: driverExpenses,
        net: driverEarnings - driverExpenses
      }
    }) || []

    // Calculate earnings by platform
    const uberEarnings = earnings?.reduce((sum, e) => sum + e.uber_cash + e.uber_account, 0) || 0
    const boltEarnings = earnings?.reduce((sum, e) => sum + e.bolt_cash + e.bolt_account, 0) || 0
    const individualEarnings = earnings?.reduce((sum, e) => sum + e.individual_rides_cash + e.individual_rides_account, 0) || 0

    const earningsByPlatform = [
      { name: 'Uber', value: uberEarnings, color: '#3b82f6' },
      { name: 'Bolt', value: boltEarnings, color: '#10b981' },
      { name: 'Individual', value: individualEarnings, color: '#f59e0b' }
    ]

    // Calculate earnings by date
    const earningsByDate = earnings?.reduce((acc, earning) => {
      const existing = acc.find(item => item.date === earning.date)
      if (existing) {
        existing.uber += earning.uber_cash + earning.uber_account
        existing.bolt += earning.bolt_cash + earning.bolt_account
        existing.individual += earning.individual_rides_cash + earning.individual_rides_account
        existing.total += earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account
      } else {
        acc.push({
          date: earning.date,
          uber: earning.uber_cash + earning.uber_account,
          bolt: earning.bolt_cash + earning.bolt_account,
          individual: earning.individual_rides_cash + earning.individual_rides_account,
          total: earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account
        })
      }
      return acc
    }, [] as Array<{date: string, uber: number, bolt: number, individual: number, total: number}>) || []

    // Calculate expenses by type
    const expensesByType = expenses?.reduce((acc, expense) => {
      const existing = acc.find(item => item.type === expense.expense_type)
      if (existing) {
        existing.amount += expense.amount
        existing.count += 1
      } else {
        acc.push({
          type: expense.expense_type,
          amount: expense.amount,
          count: 1
        })
      }
      return acc
    }, [] as Array<{type: string, amount: number, count: number}>) || []

    const dashboardStats: DashboardStats = {
      companyStats: {
        totalCars,
        totalOwners,
        totalActiveDrivers,
        totalMandatoryDues,
        totalEarnings,
        totalExpenses,
        netProfit
      },
      carLevelPL,
      driverLevelPL,
      earningsByPlatform,
      earningsByDate: earningsByDate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      expensesByType
    }

    // Meta/debug information to validate filters end-to-end
    const meta = {
      dateRange,
      earnings: {
        count: earnings?.length || 0,
        minDate: earnings && earnings.length ? earnings.reduce((min, e) => e.date < min ? e.date : min, earnings[0].date) : null,
        maxDate: earnings && earnings.length ? earnings.reduce((max, e) => e.date > max ? e.date : max, earnings[0].date) : null,
        total: totalEarnings
      },
      expenses: {
        count: expenses?.length || 0,
        minDate: expenses && expenses.length ? expenses.reduce((min, e) => e.date < min ? e.date : min, expenses[0].date) : null,
        maxDate: expenses && expenses.length ? expenses.reduce((max, e) => e.date > max ? e.date : max, expenses[0].date) : null,
        total: totalExpenses
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: dashboardStats, meta }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in calculate-dashboard-stats:', error)
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
