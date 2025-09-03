'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Car, DriverEarning, DriverExpense, Attendance } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Car as CarIcon, Clock, DollarSign, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function DriverDashboard() {
  const { appUser, user, loading: authLoading } = useAuth()
  const [car, setCar] = useState<Car | null>(null)
  const [todayEarnings, setTodayEarnings] = useState<DriverEarning | null>(null)
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [showEarningsDialog, setShowEarningsDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  // Debug authentication state
  console.log('DriverDashboard - Auth state:', {
    authLoading,
    user: user?.id,
    appUser: appUser?.id,
    appUserRole: appUser?.role,
    appUserEmail: appUser?.email
  })

  // Form states
  const [earningsForm, setEarningsForm] = useState({
    uber_cash: 0,
    uber_account: 0,
    bolt_cash: 0,
    bolt_account: 0,
    individual_cash: 0,
    notes: ''
  })

  const [expenseForm, setExpenseForm] = useState({
    expense_type: '',
    amount: 0,
    proof_url: ''
  })

  const [leaveForm, setLeaveForm] = useState({
    reason: ''
  })

  useEffect(() => {
    if (appUser) {
      console.log('AppUser found, fetching driver data...')
      fetchDriverData()
    } else {
      console.log('No appUser found, skipping data fetch')
    }
  }, [appUser])

  // Test Supabase connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...')
        const { data, error } = await supabase.auth.getSession()
        console.log('Current session:', data.session?.user?.id)
        console.log('Auth user ID:', data.session?.user?.id)
        console.log('App user ID:', appUser?.id)
        console.log('IDs match:', data.session?.user?.id === appUser?.id)
        
        if (appUser) {
          // Test a simple query
          const { data: testData, error: testError } = await supabase
            .from('users')
            .select('id, role')
            .eq('id', appUser.id)
            .single()
          
          console.log('Test query result:', { testData, testError })
          
          // Test RLS by trying to read from driver_earnings
          const { data: earningsTest, error: earningsTestError } = await supabase
            .from('driver_earnings')
            .select('*')
            .eq('driver_id', appUser.id)
            .limit(1)
          
          console.log('RLS test for driver_earnings:', { earningsTest, earningsTestError })
        }
      } catch (error) {
        console.error('Connection test failed:', error)
      }
    }
    
    testConnection()
  }, [appUser])

  // Reset forms daily
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const lastResetDate = localStorage.getItem('lastResetDate')
    
    if (lastResetDate !== today) {
      // Reset forms for new day
      setEarningsForm({
        uber_cash: 0,
        uber_account: 0,
        bolt_cash: 0,
        bolt_account: 0,
        individual_cash: 0,
        notes: ''
      })
      setExpenseForm({
        expense_type: '',
        amount: 0,
        proof_url: ''
      })
      localStorage.setItem('lastResetDate', today)
    }
  }, [])

  const fetchDriverData = async () => {
    if (!appUser) {
      console.log('No appUser found in fetchDriverData')
      return
    }

    console.log('Fetching driver data for user:', appUser.id)
    console.log('User role:', appUser.role)
    console.log('Assigned car ID:', appUser.assigned_car_id)

    try {
      // Get the auth user ID to match RLS policies
      const { data: session } = await supabase.auth.getSession()
      const authUserId = session.session?.user?.id
      
      if (!authUserId) {
        console.error('No authenticated user found')
        return
      }
      
      console.log('Auth user ID for queries:', authUserId)

      // Fetch assigned car
      if (appUser.assigned_car_id) {
        console.log('Fetching car data...')
        const { data: carData, error: carError } = await supabase
          .from('cars')
          .select('*')
          .eq('id', appUser.assigned_car_id)
          .single()
        
        if (carError) {
          console.error('Error fetching car:', carError)
        } else {
          console.log('Car data:', carData)
        setCar(carData)
      }
      }

      // Fetch today's earnings
      const today = new Date().toISOString().split('T')[0]
      console.log('Fetching earnings for date:', today)
      const { data: earningsData, error: earningsError } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', authUserId) // Use auth user ID
        .eq('date', today)
        .single()
      
      if (earningsError && earningsError.code !== 'PGRST116') {
        console.error('Error fetching earnings:', earningsError)
      } else {
        console.log('Earnings data:', earningsData)
      setTodayEarnings(earningsData)

        // Populate earnings form with existing data
        if (earningsData) {
          setEarningsForm({
            uber_cash: earningsData.uber_cash || 0,
            uber_account: earningsData.uber_account || 0,
            bolt_cash: earningsData.bolt_cash || 0,
            bolt_account: earningsData.bolt_account || 0,
            individual_cash: earningsData.individual_cash || 0,
            notes: earningsData.notes || ''
          })
        }
      }

      // Fetch recent expenses
      console.log('Fetching expenses...')
      const { data: expensesData, error: expensesError } = await supabase
        .from('driver_expenses')
        .select('*')
        .eq('driver_id', authUserId) // Use auth user ID
        .order('date', { ascending: false })
        .limit(10)
      
      if (expensesError) {
        console.error('Error fetching expenses:', expensesError)
      } else {
        console.log('Expenses data:', expensesData)
      setExpenses(expensesData || [])
      }

      // Fetch today's attendance
      console.log('Fetching attendance for date:', today)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('driver_id', authUserId) // Use auth user ID
        .eq('date', today)
        .single()
      
      if (attendanceError && attendanceError.code !== 'PGRST116') {
        console.error('Error fetching attendance:', attendanceError)
      } else {
        console.log('Attendance data:', attendanceData)
      setAttendance(attendanceData)
      }

    } catch (error) {
      console.error('Error fetching driver data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEarnings = async () => {
    if (!appUser) {
      console.log('No app user found for earnings')
      return
    }

    console.log('Saving earnings:', earningsForm)
    console.log('User ID:', appUser.id)
    console.log('User role:', appUser.role)
    
    try {
      // Get the auth user ID to match RLS policies
      const { data: session } = await supabase.auth.getSession()
      const authUserId = session.session?.user?.id
      
      if (!authUserId) {
        throw new Error('No authenticated user found')
      }
      
      console.log('Auth user ID:', authUserId)
      console.log('App user ID:', appUser.id)
      console.log('IDs match:', authUserId === appUser.id)
      
      const earningsData = {
        driver_id: authUserId, // Use auth.uid() to match RLS policies
        date: new Date().toISOString().split('T')[0],
        uber_cash: earningsForm.uber_cash || 0,
        uber_account: earningsForm.uber_account || 0,
        bolt_cash: earningsForm.bolt_cash || 0,
        bolt_account: earningsForm.bolt_account || 0,
        individual_cash: earningsForm.individual_cash || 0,
        notes: earningsForm.notes || ''
      }
      
      console.log('Earnings data to insert:', earningsData)
      
      const { data, error } = await supabase
        .from('driver_earnings')
        .upsert(earningsData, { 
          onConflict: 'driver_id,date',
          ignoreDuplicates: false 
        })
        .select()

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase earnings error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('Earnings saved successfully:', data)
      toast.success('Earnings saved successfully')
      fetchDriverData()
    } catch (error) {
      console.error('Error saving earnings - full error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      toast.error(`Failed to save earnings: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleSubmitExpense = async () => {
    if (!appUser) {
      console.log('No app user found for expense')
      return
    }

    console.log('Submitting expense:', expenseForm)
    console.log('User ID:', appUser.id)
    console.log('User role:', appUser.role)
    
    // Validate required fields
    if (!expenseForm.expense_type) {
      toast.error('Please select an expense type')
      return
    }
    
    if (!expenseForm.amount || expenseForm.amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    try {
      // Get the auth user ID to match RLS policies
      const { data: session } = await supabase.auth.getSession()
      const authUserId = session.session?.user?.id
      
      if (!authUserId) {
        throw new Error('No authenticated user found')
      }
      
      console.log('Auth user ID:', authUserId)
      console.log('App user ID:', appUser.id)
      console.log('IDs match:', authUserId === appUser.id)
      
      const expenseData = {
        driver_id: authUserId, // Use auth.uid() to match RLS policies
        date: new Date().toISOString().split('T')[0],
        expense_type: expenseForm.expense_type,
        amount: expenseForm.amount,
        proof_url: expenseForm.proof_url || null
      }
      
      console.log('Expense data to insert:', expenseData)
      
      const { data, error } = await supabase
        .from('driver_expenses')
        .insert(expenseData)
        .select()

      console.log('Supabase expense response:', { data, error })

      if (error) {
        console.error('Supabase expense error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error('Full error object:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Expense submitted successfully:', data)
      toast.success('Expense submitted successfully')
      setShowExpenseDialog(false)
      setExpenseForm({ expense_type: '', amount: 0, proof_url: '' })
      fetchDriverData()
    } catch (error) {
      console.error('Error submitting expense - full error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      console.error('Error JSON:', JSON.stringify(error, null, 2))
      
      // Try to extract error message from different possible structures
      let errorMessage = 'Unknown error'
      if (error && typeof error === 'object') {
        errorMessage = error.message || error.details || error.hint || JSON.stringify(error)
      }
      
      toast.error(`Failed to submit expense: ${errorMessage}`)
    }
  }

  const handleRequestLeave = async () => {
    if (!appUser) return

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          driver_id: appUser.id,
          date: new Date().toISOString().split('T')[0],
          status: 'leave'
        })

      if (error) throw error

      toast.success('Leave request submitted')
      setShowLeaveDialog(false)
      setLeaveForm({ reason: '' })
      fetchDriverData()
    } catch (error) {
      console.error('Error requesting leave:', error)
      toast.error('Failed to request leave')
    }
  }

  const handleStartTime = async () => {
    if (!appUser) {
      console.log('No app user found')
      return
    }

    console.log('Starting work for user:', appUser.id)
    console.log('App user role:', appUser.role)
    
    try {
      // Get the auth user ID to match RLS policies
      console.log('Getting session...')
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        throw sessionError
      }
      
      console.log('Session data:', session)
      const authUserId = session.session?.user?.id
      
      if (!authUserId) {
        console.error('No auth user ID found in session')
        throw new Error('No authenticated user found')
      }
      
      console.log('Auth user ID:', authUserId)
      console.log('Auth user ID matches app user ID:', authUserId === appUser.id)
      
      const attendanceData = {
        driver_id: authUserId, // Use auth.uid() to match RLS policies
          date: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().split(' ')[0],
          status: 'present'
      }
      
      console.log('Inserting attendance record:', attendanceData)
      console.log('About to call supabase.upsert...')
      
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { 
          onConflict: 'driver_id,date',
          ignoreDuplicates: false 
        })
        .select()

      console.log('Start time response:', { data, error })
      console.log('Response data type:', typeof data)
      console.log('Response error type:', typeof error)

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error('Full error object:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('Start time recorded successfully:', data)
      toast.success('Start time recorded')
      console.log('About to fetch driver data...')
      fetchDriverData()
    } catch (error) {
      console.error('Error recording start time - full error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      console.error('Error JSON:', JSON.stringify(error, null, 2))
      toast.error(`Failed to record start time: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleEndTime = async () => {
    if (!appUser) return

    try {
      // Get the auth user ID to match RLS policies
      const { data: session } = await supabase.auth.getSession()
      const authUserId = session.session?.user?.id
      
      if (!authUserId) {
        throw new Error('No authenticated user found')
      }
      
      console.log('Current attendance data:', attendance)
      console.log('About to update with end time...')
      
      const attendanceData = {
        driver_id: authUserId, // Use auth.uid() to match RLS policies
          date: new Date().toISOString().split('T')[0],
        start_time: attendance?.start_time, // Keep the existing start time
        end_time: new Date().toTimeString().split(' ')[0], // Add the end time
          status: 'present'
      }
      
      console.log('Updating attendance record with end time:', attendanceData)
      
      const { data, error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { 
          onConflict: 'driver_id,date',
          ignoreDuplicates: false 
        })
        .select()

      console.log('End time response:', { data, error })

      if (error) {
        console.error('End time error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        console.error('Full error object:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('End time recorded successfully:', data)
      toast.success('End time recorded')
      fetchDriverData()
    } catch (error) {
      console.error('Error recording end time - full error:', error)
      console.error('Error type:', typeof error)
      console.error('Error keys:', Object.keys(error || {}))
      console.error('Error JSON:', JSON.stringify(error, null, 2))
      toast.error(`Failed to record end time: ${error?.message || 'Unknown error'}`)
    }
  }

  // Test function to manually test database operations
  const testDatabaseOperations = async () => {
    if (!appUser) {
      console.log('No appUser for testing')
      return
    }

    console.log('Testing database operations...')
    
    try {
      // Get current auth user ID
      const { data: session } = await supabase.auth.getSession()
      const authUserId = session.session?.user?.id
      console.log('Auth user ID:', authUserId)
      console.log('App user ID:', appUser.id)
      
      // Test 1: Insert a test earnings record with auth.uid()
      console.log('Test 1: Inserting test earnings with auth.uid()...')
      const { data: earningsResult, error: earningsError } = await supabase
        .from('driver_earnings')
        .insert({
          driver_id: authUserId, // Use auth.uid() instead of appUser.id
          date: new Date().toISOString().split('T')[0],
          uber_cash: 100,
          uber_account: 50,
          bolt_cash: 75,
          bolt_account: 25,
          individual_cash: 30,
          notes: 'Test earnings'
        })
        .select()

      console.log('Earnings test result:', { earningsResult, earningsError })

      // Test 2: Insert a test expense record
      console.log('Test 2: Inserting test expense...')
      const { data: expenseResult, error: expenseError } = await supabase
        .from('driver_expenses')
        .insert({
          driver_id: authUserId, // Use auth.uid() instead of appUser.id
          date: new Date().toISOString().split('T')[0],
          expense_type: 'fuel',
          amount: 50,
          proof_url: 'test'
        })
        .select()

      console.log('Expense test result:', { expenseResult, expenseError })

      // Test 3: Insert a test attendance record
      console.log('Test 3: Inserting test attendance...')
      const { data: attendanceResult, error: attendanceError } = await supabase
        .from('attendance')
        .insert({
          driver_id: authUserId, // Use auth.uid() instead of appUser.id
          date: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().split(' ')[0],
          status: 'present'
        })
        .select()

      console.log('Attendance test result:', { attendanceResult, attendanceError })

      toast.success('Database tests completed - check console for results')
      
    } catch (error) {
      console.error('Database test failed:', error)
      toast.error('Database test failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalEarnings = (todayEarnings?.uber_cash || 0) + 
                       (todayEarnings?.uber_account || 0) + 
                       (todayEarnings?.bolt_cash || 0) + 
                       (todayEarnings?.bolt_account || 0) + 
                       (todayEarnings?.individual_cash || 0)

  const monthlyDue = car?.monthly_due || 7500
  const progressPercentage = Math.min((totalEarnings / monthlyDue) * 100, 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center">
            <CarIcon className="h-3 w-3 mr-1" />
            {car?.plate_number || 'No car assigned'}
          </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('=== DEBUG INFO ===')
                  console.log('AppUser:', appUser)
                  console.log('User:', user)
                  console.log('Attendance:', attendance)
                  console.log('Today Earnings:', todayEarnings)
                  console.log('Earnings Form:', earningsForm)
                  console.log('Expense Form:', expenseForm)
                  console.log('==================')
                }}
              >
                Debug
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={testDatabaseOperations}
              >
                Test DB
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // Fill form with test data
                  setExpenseForm({
                    expense_type: 'fuel',
                    amount: 50,
                    proof_url: 'test-url'
                  })
                  setShowExpenseDialog(true)
                  console.log('Test expense form filled and dialog opened')
                }}
              >
                Test Expense
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) {
                    console.log('No app user for expense test')
                    return
                  }
                  
                  try {
                    console.log('=== DIRECT EXPENSE TEST ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Testing direct expense insert...')
                    console.log('Auth user ID:', authUserId)
                    
                    const expenseData = {
                      driver_id: authUserId,
                      date: new Date().toISOString().split('T')[0],
                      expense_type: 'fuel',
                      amount: 25,
                      proof_url: 'direct-test'
                    }
                    
                    console.log('Expense data to insert:', expenseData)
                    
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert(expenseData)
                      .select()
                    
                    console.log('Direct expense result:', { data, error })
                    
                    if (error) {
                      console.error('Direct expense error:', JSON.stringify(error, null, 2))
                      toast.error('Direct expense test failed')
                    } else {
                      console.log('Direct expense success!')
                      toast.success('Direct expense test passed')
                    }
                  } catch (error) {
                    console.error('Direct expense test failed:', error)
                    toast.error('Direct expense test failed')
                  }
                }}
              >
                Test Direct
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) return
                    
                    console.log('Testing simple expense insert...')
                    
                    // Try simple insert without description
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert({
                        driver_id: authUserId,
                        date: new Date().toISOString().split('T')[0],
                        expense_type: 'fuel',
                        amount: 10,
                        proof_url: 'test'
                      })
                      .select()
                    
                    console.log('Simple expense test result:', { data, error })
                    
                    if (error) {
                      console.error('Simple expense error:', JSON.stringify(error, null, 2))
                    } else {
                      console.log('Simple expense success!')
                      toast.success('Simple expense test passed')
                    }
                  } catch (error) {
                    console.error('Simple expense test failed:', error)
                  }
                }}
              >
                Test Simple
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) return
                    
                    // Delete today's attendance record
                    const { error } = await supabase
                      .from('attendance')
                      .delete()
                      .eq('driver_id', authUserId)
                      .eq('date', new Date().toISOString().split('T')[0])
                    
                    if (error) {
                      console.error('Error clearing attendance:', error)
                    } else {
                      console.log('Attendance cleared successfully')
                      toast.success('Attendance cleared for testing')
                      fetchDriverData()
                    }
                  } catch (error) {
                    console.error('Error clearing attendance:', error)
                  }
                }}
              >
                Clear Attendance
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== MINIMAL EXPENSE TEST ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Testing minimal expense insert...')
                    console.log('Auth user ID:', authUserId)
                    
                    // Test with absolute minimal data
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert({
                        driver_id: authUserId,
                        date: new Date().toISOString().split('T')[0],
                        expense_type: 'fuel',
                        amount: 1
                      })
                      .select()
                    
                    console.log('Minimal expense result:', { data, error })
                    
                    if (error) {
                      console.error('Minimal expense error:', JSON.stringify(error, null, 2))
                      toast.error('Minimal expense test failed')
                    } else {
                      console.log('Minimal expense success!')
                      toast.success('Minimal expense test passed')
                    }
                  } catch (error) {
                    console.error('Minimal expense test failed:', error)
                    toast.error('Minimal expense test failed')
                  }
                }}
              >
                Test Minimal
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== EXPENSE FORM SIMULATION ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    // Simulate the exact same data that the form would send
                    const expenseData = {
                      driver_id: authUserId,
                      date: new Date().toISOString().split('T')[0],
                      expense_type: 'fuel',
                      amount: 50,
                      proof_url: 'test-url'
                    }
                    
                    console.log('Simulating form submission with data:', expenseData)
                    
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert(expenseData)
                      .select()
                    
                    console.log('Form simulation result:', { data, error })
                    
                    if (error) {
                      console.error('Form simulation error:', JSON.stringify(error, null, 2))
                      toast.error('Form simulation failed')
                    } else {
                      console.log('Form simulation success!')
                      toast.success('Form simulation passed')
                    }
                  } catch (error) {
                    console.error('Form simulation failed:', error)
                    toast.error('Form simulation failed')
                  }
                }}
              >
                Test Form
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== DIRECT EXPENSE SUBMISSION TEST ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Testing direct expense submission...')
                    console.log('Auth user ID:', authUserId)
                    console.log('App user ID:', appUser.id)
                    console.log('IDs match:', authUserId === appUser.id)
                    
                    // Test with the exact same logic as handleSubmitExpense
                    const expenseData = {
                      driver_id: authUserId,
                      date: new Date().toISOString().split('T')[0],
                      expense_type: 'fuel',
                      amount: 25,
                      proof_url: 'direct-test'
                    }
                    
                    console.log('Expense data to insert:', expenseData)
                    
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert(expenseData)
                      .select()
                    
                    console.log('Direct expense submission result:', { data, error })
                    
                    if (error) {
                      console.error('Direct expense submission error:', JSON.stringify(error, null, 2))
                      toast.error('Direct expense submission failed')
                    } else {
                      console.log('Direct expense submission success!')
                      toast.success('Direct expense submission passed')
                      // Refresh data to show the new expense
                      fetchDriverData()
                    }
                  } catch (error) {
                    console.error('Direct expense submission failed:', error)
                    toast.error('Direct expense submission failed')
                  }
                }}
              >
                Test Direct Submit
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== SIMPLE EXPENSE TEST ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Testing simple expense insert...')
                    console.log('Auth user ID:', authUserId)
                    
                    // Test with minimal data
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert({
                        driver_id: authUserId,
                        date: new Date().toISOString().split('T')[0],
                        expense_type: 'fuel',
                        amount: 10
                      })
                      .select()
                    
                    console.log('Simple expense test result:', { data, error })
                    
                    if (error) {
                      console.error('Simple expense test error:', JSON.stringify(error, null, 2))
                      toast.error('Simple expense test failed')
                    } else {
                      console.log('Simple expense test success!')
                      toast.success('Simple expense test passed')
                    }
                  } catch (error) {
                    console.error('Simple expense test failed:', error)
                    toast.error('Simple expense test failed')
                  }
                }}
              >
                Test Simple
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== CHECK EXPENSE TABLE ACCESS ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Testing expense table access...')
                    console.log('Auth user ID:', authUserId)
                    
                    // Test if we can read from the table
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .select('*')
                      .eq('driver_id', authUserId)
                      .limit(1)
                    
                    console.log('Expense table access result:', { data, error })
                    
                    if (error) {
                      console.error('Expense table access error:', JSON.stringify(error, null, 2))
                      toast.error('Expense table access failed')
                    } else {
                      console.log('Expense table accessible!')
                      toast.success('Expense table accessible')
                    }
                  } catch (error) {
                    console.error('Expense table access test failed:', error)
                    toast.error('Expense table access test failed')
                  }
                }}
              >
                Test Table Access
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== TEST END TIME DIRECTLY ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Testing end time update directly...')
                    console.log('Auth user ID:', authUserId)
                    console.log('Current attendance:', attendance)
                    
                    const attendanceData = {
                      driver_id: authUserId,
                      date: new Date().toISOString().split('T')[0],
                      start_time: attendance?.start_time,
                      end_time: new Date().toTimeString().split(' ')[0],
                      status: 'present'
                    }
                    
                    console.log('End time data to update:', attendanceData)
                    
                    const { data, error } = await supabase
                      .from('attendance')
                      .upsert(attendanceData, { 
                        onConflict: 'driver_id,date',
                        ignoreDuplicates: false 
                      })
                      .select()
                    
                    console.log('Direct end time test result:', { data, error })
                    
                    if (error) {
                      console.error('Direct end time test error:', JSON.stringify(error, null, 2))
                      toast.error('Direct end time test failed')
                    } else {
                      console.log('Direct end time test success!')
                      toast.success('Direct end time test passed')
                      fetchDriverData()
                    }
                  } catch (error) {
                    console.error('Direct end time test failed:', error)
                    toast.error('Direct end time test failed')
                  }
                }}
              >
                Test End Time
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('=== ATTENDANCE WORKFLOW TEST ===')
                  console.log('Current attendance state:', attendance)
                  console.log('Start button should be:', attendance?.start_time ? 'DISABLED' : 'ENABLED')
                  console.log('End button should be:', attendance?.start_time && !attendance?.end_time ? 'ENABLED' : 'DISABLED')
                  console.log('Workflow status:')
                  console.log('1. Start work:', attendance?.start_time ? '✓ COMPLETED' : '⏳ PENDING')
                  console.log('2. End work:', attendance?.end_time ? '✓ COMPLETED' : attendance?.start_time ? '⏳ READY' : '⏸ WAITING FOR START')
                  console.log('===============================')
                }}
              >
                Test Workflow
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('Testing attendance table access...')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    // Test simple select from attendance table
                    const { data, error } = await supabase
                      .from('attendance')
                      .select('*')
                      .eq('driver_id', authUserId)
                      .limit(1)
                    
                    console.log('Attendance table test result:', { data, error })
                    
                    if (error) {
                      console.error('Attendance table error:', JSON.stringify(error, null, 2))
                    } else {
                      console.log('Attendance table accessible!')
                      toast.success('Attendance table accessible')
                    }
                  } catch (error) {
                    console.error('Attendance table test failed:', error)
                  }
                }}
              >
                Test Table
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  if (!appUser) return
                  
                  try {
                    console.log('=== COMPREHENSIVE DATABASE TEST ===')
                    const { data: session } = await supabase.auth.getSession()
                    const authUserId = session.session?.user?.id
                    
                    if (!authUserId) {
                      console.error('No auth user ID')
                      return
                    }
                    
                    console.log('Auth user ID:', authUserId)
                    console.log('App user ID:', appUser.id)
                    console.log('IDs match:', authUserId === appUser.id)
                    
                    // Test 1: Check if user exists in users table
                    console.log('Test 1: Checking user in users table...')
                    const { data: userData, error: userError } = await supabase
                      .from('users')
                      .select('id, role, email')
                      .eq('id', authUserId)
                      .single()
                    
                    console.log('User table result:', { userData, userError })
                    
                    // Test 2: Test earnings insert
                    console.log('Test 2: Testing earnings insert...')
                    const { data: earningsData, error: earningsError } = await supabase
                      .from('driver_earnings')
                      .insert({
                        driver_id: authUserId,
                        date: new Date().toISOString().split('T')[0],
                        uber_cash: 100,
                        uber_account: 50,
                        bolt_cash: 75,
                        bolt_account: 25,
                        individual_cash: 30,
                        notes: 'Test earnings'
                      })
                      .select()
                    
                    console.log('Earnings insert result:', { earningsData, earningsError })
                    
                    // Test 3: Test expense insert
                    console.log('Test 3: Testing expense insert...')
                    const { data: expenseData, error: expenseError } = await supabase
                      .from('driver_expenses')
                      .insert({
                        driver_id: authUserId,
                        date: new Date().toISOString().split('T')[0],
                        expense_type: 'fuel',
                        amount: 25,
                        proof_url: 'test'
                      })
                      .select()
                    
                    console.log('Expense insert result:', { expenseData, expenseError })
                    
                    // Test 4: Test attendance insert
                    console.log('Test 4: Testing attendance insert...')
                    const { data: attendanceData, error: attendanceError } = await supabase
                      .from('attendance')
                      .insert({
                        driver_id: authUserId,
                        date: new Date().toISOString().split('T')[0],
                        start_time: new Date().toTimeString().split(' ')[0],
                        status: 'present'
                      })
                      .select()
                    
                    console.log('Attendance insert result:', { attendanceData, attendanceError })
                    
                    // Summary
                    console.log('=== TEST SUMMARY ===')
                    console.log('User table access:', userError ? 'FAILED' : 'SUCCESS')
                    console.log('Earnings insert:', earningsError ? 'FAILED' : 'SUCCESS')
                    console.log('Expense insert:', expenseError ? 'FAILED' : 'SUCCESS')
                    console.log('Attendance insert:', attendanceError ? 'FAILED' : 'SUCCESS')
                    console.log('===================')
                    
                    if (earningsError || expenseError || attendanceError) {
                      toast.error('Some database operations failed - check console')
                    } else {
                      toast.success('All database operations successful!')
                    }
                    
                  } catch (error) {
                    console.error('Comprehensive test failed:', error)
                    toast.error('Database test failed')
                  }
                }}
              >
                Test All DB
              </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Today's Tasks Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Today&apos;s Tasks
                </CardTitle>
                <CardDescription>Complete your daily checklist</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Start Work Task */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${attendance?.start_time ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <Clock className={`h-4 w-4 ${attendance?.start_time ? 'text-green-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">Start Work</h4>
                      <p className="text-sm text-gray-500">
                        {attendance?.start_time 
                          ? `Started at ${attendance.start_time}` 
                          : 'Record your start time'
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => {
                      console.log('Start button clicked')
                      console.log('Current attendance state:', attendance)
                      console.log('Start time exists:', !!attendance?.start_time)
                      handleStartTime()
                    }} 
                    disabled={attendance?.start_time ? true : false}
                    className="flex items-center space-x-2"
                  >
                    <span>{attendance?.start_time ? 'Started' : 'Start'}</span>
                    <span>{attendance?.start_time ? '✓' : '▶'}</span>
                  </Button>
                </div>

                {/* Update Earnings Task */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Update Earnings</h4>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Uber: Cash AED {todayEarnings?.uber_cash || 0} | Account AED {todayEarnings?.uber_account || 0}</div>
                        <div>Bolt: Cash AED {todayEarnings?.bolt_cash || 0} | Account AED {todayEarnings?.bolt_account || 0}</div>
                        <div>Individual: AED {todayEarnings?.individual_cash || 0}</div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      console.log('Edit earnings button clicked')
                      setShowEarningsDialog(true)
                    }}
                    disabled={attendance?.end_time ? true : false}
                    className="flex items-center space-x-2"
                  >
                    <span>{attendance?.end_time ? 'Locked' : 'Edit'}</span>
                    <span>{attendance?.end_time ? '🔒' : '✏️'}</span>
                  </Button>
                </div>

                {/* Record Expenses Task */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <DollarSign className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Record Expenses</h4>
                      <p className="text-sm text-gray-500">Add fuel, maintenance, or other costs</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      console.log('Add expense button clicked')
                      setShowExpenseDialog(true)
                    }}
                    disabled={attendance?.end_time ? true : false}
                    className="flex items-center space-x-2"
                  >
                    <span>{attendance?.end_time ? 'Locked' : 'Add'}</span>
                    <span>{attendance?.end_time ? '🔒' : '+'}</span>
                  </Button>
                </div>

                {/* End Work Task */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      attendance?.end_time ? 'bg-green-100' : 
                      attendance?.start_time ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <Clock className={`h-4 w-4 ${
                        attendance?.end_time ? 'text-green-600' : 
                        attendance?.start_time ? 'text-red-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium">End Work</h4>
                      <p className="text-sm text-gray-500">
                        {attendance?.end_time 
                          ? `Ended at ${attendance.end_time}` 
                          : attendance?.start_time 
                            ? 'Mark your end time' 
                            : 'Start work first'
                        }
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={async () => {
                      console.log('=== END WORK BUTTON CLICKED ===')
                      console.log('End work button clicked')
                      console.log('Attendance start time:', attendance?.start_time)
                      console.log('Today earnings:', todayEarnings)
                      console.log('End time exists:', attendance?.end_time)
                      console.log('App user:', appUser)
                      console.log('About to call handleEndTime...')
                      
                      try {
                        await handleEndTime()
                        console.log('handleEndTime completed successfully')
                      } catch (error) {
                        console.error('handleEndTime failed:', error)
                      }
                    }} 
                    disabled={!attendance?.start_time || attendance?.end_time ? true : false}
                    className="flex items-center space-x-2"
                  >
                    <span>{attendance?.end_time ? 'Ended' : 'End'}</span>
                    <span>{attendance?.end_time ? '✓' : '⏹'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Earnings Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Weekly Earnings Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Weekly earnings chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Car Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CarIcon className="h-5 w-5 mr-2" />
                Car Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {car ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Plate Number</Label>
                    <p className="text-lg font-semibold">{car.plate_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Model</Label>
                    <p className="text-lg font-semibold">{car.model}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Monthly Due</Label>
                    <p className="text-lg font-semibold">AED {car.monthly_due.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No car assigned</p>
              )}
            </CardContent>
          </Card>

          {/* P&L Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Today&apos;s Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  AED {totalEarnings.toLocaleString()}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Uber Cash:</span>
                    <span>AED {todayEarnings?.uber_cash || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uber Account:</span>
                    <span>AED {todayEarnings?.uber_account || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bolt Cash:</span>
                    <span>AED {todayEarnings?.bolt_cash || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bolt Account:</span>
                    <span>AED {todayEarnings?.bolt_account || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Individual Cash:</span>
                    <span>AED {todayEarnings?.individual_cash || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Monthly Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Monthly Due: AED {monthlyDue.toLocaleString()}</span>
                      <span>{progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="mt-2" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      AED {(monthlyDue - totalEarnings).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Remaining to reach target</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Earnings Log</CardTitle>
              <CardDescription>Update your daily earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uber_cash">Uber Cash</Label>
                  <Input
                    id="uber_cash"
                    type="number"
                    value={earningsForm.uber_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_cash: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="uber_account">Uber Account</Label>
                  <Input
                    id="uber_account"
                    type="number"
                    value={earningsForm.uber_account}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_account: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="bolt_cash">Bolt Cash</Label>
                  <Input
                    id="bolt_cash"
                    type="number"
                    value={earningsForm.bolt_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_cash: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="bolt_account">Bolt Account</Label>
                  <Input
                    id="bolt_account"
                    type="number"
                    value={earningsForm.bolt_account}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_account: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="individual_cash">Individual Cash</Label>
                  <Input
                    id="individual_cash"
                    type="number"
                    value={earningsForm.individual_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_cash: Number(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={earningsForm.notes}
                  onChange={(e) => setEarningsForm({...earningsForm, notes: e.target.value})}
                  placeholder="Any additional notes..."
                />
              </div>
              <Button onClick={handleSaveEarnings} className="w-full">
                Save Earnings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Expenses</h2>
            <Button onClick={() => setShowExpenseDialog(true)}>Add Expense</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expense.expense_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          AED {expense.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={expense.status === 'approved' ? 'default' : 
                                   expense.status === 'rejected' ? 'destructive' : 'secondary'}
                          >
                            {expense.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Today&apos;s Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Status</div>
                    <Badge variant={attendance?.status === 'present' ? 'default' : 
                                   attendance?.status === 'leave' ? 'secondary' : 'destructive'}>
                      {attendance?.status || 'Not marked'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Start Time</div>
                    <div className="font-medium">{attendance?.start_time || 'Not recorded'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">End Time</div>
                    <div className="font-medium">{attendance?.end_time || 'Not recorded'}</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  {!attendance?.start_time && (
                    <Button onClick={handleStartTime} className="flex-1">
                      Mark Start Time
                    </Button>
                  )}
                  {attendance?.start_time && !attendance?.end_time && (
                    <Button onClick={handleEndTime} className="flex-1">
                      Mark End Time
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={() => setShowLeaveDialog(true)}
                  >
                    Request Leave
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs - placed outside tabs so they can be accessed from any tab */}
      {/* Earnings Dialog */}
      <Dialog open={showEarningsDialog} onOpenChange={setShowEarningsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Today&apos;s Earnings</DialogTitle>
            <DialogDescription>
              Enter your earnings for today
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dialog_uber_cash">Uber Cash</Label>
                <Input
                  id="dialog_uber_cash"
                  type="number"
                  value={earningsForm.uber_cash}
                  onChange={(e) => setEarningsForm({...earningsForm, uber_cash: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="dialog_uber_account">Uber Account</Label>
                <Input
                  id="dialog_uber_account"
                  type="number"
                  value={earningsForm.uber_account}
                  onChange={(e) => setEarningsForm({...earningsForm, uber_account: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="dialog_bolt_cash">Bolt Cash</Label>
                <Input
                  id="dialog_bolt_cash"
                  type="number"
                  value={earningsForm.bolt_cash}
                  onChange={(e) => setEarningsForm({...earningsForm, bolt_cash: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="dialog_bolt_account">Bolt Account</Label>
                <Input
                  id="dialog_bolt_account"
                  type="number"
                  value={earningsForm.bolt_account}
                  onChange={(e) => setEarningsForm({...earningsForm, bolt_account: Number(e.target.value)})}
                />
              </div>
              <div>
                <Label htmlFor="dialog_individual_cash">Individual Cash</Label>
                <Input
                  id="dialog_individual_cash"
                  type="number"
                  value={earningsForm.individual_cash}
                  onChange={(e) => setEarningsForm({...earningsForm, individual_cash: Number(e.target.value)})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dialog_notes">Notes</Label>
              <Input
                id="dialog_notes"
                value={earningsForm.notes}
                onChange={(e) => setEarningsForm({...earningsForm, notes: e.target.value})}
                placeholder="Any additional notes..."
              />
            </div>
            <Button onClick={() => {
              handleSaveEarnings()
              setShowEarningsDialog(false)
            }} className="w-full">
              Save Earnings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Submit an expense for approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="expense_type">Expense Type</Label>
              <Select value={expenseForm.expense_type} onValueChange={(value) => setExpenseForm({...expenseForm, expense_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (AED)</Label>
              <Input
                id="amount"
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
              />
            </div>

            <div>
              <Label htmlFor="proof_url">Proof URL (Optional)</Label>
              <Input
                id="proof_url"
                value={expenseForm.proof_url}
                onChange={(e) => setExpenseForm({...expenseForm, proof_url: e.target.value})}
                placeholder="Link to receipt or proof"
              />
            </div>
            <Button onClick={() => {
              console.log('=== EXPENSE SUBMISSION DEBUG ===')
              console.log('Submit expense button clicked')
              console.log('Expense form data:', expenseForm)
              console.log('Form validation:', {
                hasType: !!expenseForm.expense_type,
                hasAmount: expenseForm.amount > 0,
                isValid: !!expenseForm.expense_type && expenseForm.amount > 0
              })
              console.log('App user:', appUser)
              console.log('About to call handleSubmitExpense...')
              handleSubmitExpense()
            }} className="w-full">
              Submit Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
                  <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                                        <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Leave</DialogTitle>
                        <DialogDescription>
                          Submit a leave request for today
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="reason">Reason for Leave</Label>
                          <Input
                            id="reason"
                            value={leaveForm.reason}
                            onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                            placeholder="Enter reason for leave..."
                          />
                        </div>
                        <Button onClick={handleRequestLeave} className="w-full">
                          Submit Leave Request
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
  )
}
