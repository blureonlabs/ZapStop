'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CarIcon, DollarSign, Receipt, Play, Square, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Car {
  id: string
  plate_number: string
  model: string
  year: number
  color: string
  status: string
}

interface DriverEarning {
  id: string
  driver_id: string
  date: string
  uber_cash: number
  uber_account: number
  bolt_cash: number
  bolt_account: number
  total: number
  created_at: string
}

interface DriverExpense {
  id: string
  driver_id: string
  date: string
  amount: number
  description: string
  category: string
  created_at: string
}

interface Attendance {
  id: string
  driver_id: string
  date: string
  start_time: string
  end_time: string
  status: string
  created_at: string
}

export default function DriverDashboard() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [car, setCar] = useState<Car | null>(null)
  const [todayEarnings, setTodayEarnings] = useState<DriverEarning | null>(null)
  const [todayExpense, setTodayExpense] = useState<DriverExpense | null>(null)
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingEarnings, setSubmittingEarnings] = useState(false)
  const [submittingExpense, setSubmittingExpense] = useState(false)
  const [isOnLeave, setIsOnLeave] = useState(false)
  const [leaveInfo, setLeaveInfo] = useState<any>(null)

  // Form states
  const [earningsForm, setEarningsForm] = useState({
    uber_cash: 0,
    uber_account: 0,
    bolt_cash: 0,
    bolt_account: 0
  })

  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expense_type: 'fuel'
  })
  const [noExpenses, setNoExpenses] = useState(false)

  useEffect(() => {
    if (appUser) {
      fetchDriverData()
    }
  }, [appUser])

  const checkLeaveStatus = async (driverId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'approved')
        .lte('start_date', today)
        .gte('end_date', today)
        .single()

      if (leaveError && leaveError.code !== 'PGRST116') {
        console.error('Error checking leave status:', leaveError)
        return
      }

      if (leaveData) {
        setIsOnLeave(true)
        setLeaveInfo(leaveData)
      } else {
        setIsOnLeave(false)
        setLeaveInfo(null)
      }
    } catch (error) {
      console.error('Error checking leave status:', error)
    }
  }

  const fetchDriverData = useCallback(async () => {
    try {
      setLoading(true)
      const authUserId = appUser?.id

      if (!authUserId) return

      // Check if driver is on approved leave
      await checkLeaveStatus(authUserId)

      // First get the driver's assigned_car_id from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('assigned_car_id')
        .eq('id', authUserId)
        .single()

      if (userError) {
        console.error('Error fetching user data:', userError)
      } else if (userData?.assigned_car_id) {
        // Then fetch the car details using the assigned_car_id
        const { data: carData, error: carError } = await supabase
          .from('cars')
          .select('*')
          .eq('id', userData.assigned_car_id)
          .single()
        
        if (carError) {
          console.error('Error fetching car:', carError)
        } else {
          setCar(carData)
        }
      } else {
        // No car assigned
        setCar(null)
      }

      // Fetch today's earnings
      const today = new Date().toISOString().split('T')[0]
      const { data: earningsData, error: earningsError } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', authUserId)
        .eq('date', today)
        .single()
      
      if (earningsError) {
        console.error('Error fetching earnings:', earningsError)
      } else {
      setTodayEarnings(earningsData)
        if (earningsData) {
          setEarningsForm({
            uber_cash: earningsData.uber_cash || 0,
            uber_account: earningsData.uber_account || 0,
            bolt_cash: earningsData.bolt_cash || 0,
            bolt_account: earningsData.bolt_account || 0
          })
        }
      }

      // Fetch today's expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('driver_expenses')
        .select('*')
        .eq('driver_id', authUserId)
        .eq('date', today)
        .single()

      if (expenseError) {
        // If no expense record exists for today, that's normal - don't log as error
        if (expenseError.code !== 'PGRST116') {
          console.error('Error fetching expense:', expenseError)
        }
        setTodayExpense(null)
      } else {
        setTodayExpense(expenseData)
        if (expenseData) {
          setExpenseForm({
            amount: expenseData.amount || 0,
            expense_type: expenseData.expense_type || 'fuel'
          })
        }
      }

      // Fetch today's attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('driver_id', authUserId)
        .eq('date', today)
        .single()
      
      if (attendanceError) {
        // If no attendance record exists for today, that's normal - don't log as error
        if (attendanceError.code !== 'PGRST116') {
          console.error('Error fetching attendance:', attendanceError)
        }
        setAttendance(null)
      } else {
        setAttendance(attendanceData)
      }

    } catch (error) {
      console.error('Error fetching driver data:', error)
      toast.error('Failed to load driver data')
    } finally {
      setLoading(false)
    }
  }, [appUser?.id])

  const handleStartWork = async () => {
    try {
      if (!appUser?.id) {
        toast.error('User not authenticated')
      return
    }

      const today = new Date().toISOString().split('T')[0]
      const startTime = new Date().toTimeString().split(' ')[0]
      
      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          driver_id: appUser.id,
          date: today,
          start_time: startTime,
          status: 'present'
        }, {
          onConflict: 'driver_id,date'
        })
        .select()

      if (error) {
        console.error('Supabase error starting work:', error)
        toast.error(`Failed to start work: ${error.message}`)
        return
      }

      toast.success('Work started successfully!')
      setNoExpenses(false) // Reset no expenses toggle
      fetchDriverData()
    } catch (error) {
      console.error('Error starting work:', error)
      toast.error('Failed to start work')
    }
  }

  const handleEndWork = async () => {
    try {
      if (!attendance) {
        toast.error('No active work session found')
        return
      }

      // Validate earnings
      const hasEarnings = todayEarnings && (
        todayEarnings.uber_cash > 0 || 
        todayEarnings.uber_account > 0 || 
        todayEarnings.bolt_cash > 0 || 
        todayEarnings.bolt_account > 0
      )

      if (!hasEarnings) {
        toast.error('Please add earnings before ending ride')
        return
      }

      // Validate expenses
      const hasExpenses = todayExpense && todayExpense.amount > 0
      if (!hasExpenses && !noExpenses) {
        toast.error('Please add expenses or mark "No Expenses" before ending ride')
        return
      }

      const endTime = new Date().toTimeString().split(' ')[0]

      const { data, error } = await supabase
        .from('attendance')
        .upsert({
          driver_id: appUser?.id,
          date: new Date().toISOString().split('T')[0],
          start_time: attendance.start_time,
          end_time: endTime,
          status: 'present'
        }, {
          onConflict: 'driver_id,date'
        })
        .select()

      if (error) {
        console.error('Supabase error ending work:', error)
        toast.error(`Failed to end work: ${error.message}`)
        return
      }

      toast.success('Work ended successfully!')
      fetchDriverData()
    } catch (error) {
      console.error('Error ending work:', error)
      toast.error('Failed to end work')
    }
  }

  const handleUpdateEarnings = async () => {
    try {
      setSubmittingEarnings(true)
      
      // Validate form
      if (earningsForm.uber_cash < 0 || earningsForm.uber_account < 0 || 
          earningsForm.bolt_cash < 0 || earningsForm.bolt_account < 0) {
        toast.error('Earnings cannot be negative')
                    return
                  }
                  
      const today = new Date().toISOString().split('T')[0]
      console.log('Updating earnings for date:', today)
      console.log('Earnings form data:', earningsForm)
      console.log('App user ID:', appUser?.id)

      if (todayEarnings) {
        // Update existing earnings
        console.log('Updating existing earnings with ID:', todayEarnings.id)
                    const { data, error } = await supabase
          .from('driver_earnings')
          .update({
            uber_cash: earningsForm.uber_cash,
            uber_account: earningsForm.uber_account,
            bolt_cash: earningsForm.bolt_cash,
            bolt_account: earningsForm.bolt_account
          })
          .eq('id', todayEarnings.id)
                      .select()
                    
        console.log('Update result:', { data, error })
                    if (error) {
          console.error('Supabase update error:', error)
          throw error
        }
      } else {
        // Create new earnings
        console.log('Creating new earnings record')
                    const { data, error } = await supabase
          .from('driver_earnings')
                      .insert({
            driver_id: appUser?.id,
            date: today,
            uber_cash: earningsForm.uber_cash,
            uber_account: earningsForm.uber_account,
            bolt_cash: earningsForm.bolt_cash,
            bolt_account: earningsForm.bolt_account
                      })
                      .select()
                    
        console.log('Insert result:', { data, error })
                    if (error) {
          console.error('Supabase insert error:', error)
          throw error
        }
      }

      toast.success('Earnings updated successfully!')
                      fetchDriverData()
                  } catch (error) {
      console.error('Error updating earnings:', error)
      toast.error(`Failed to update earnings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmittingEarnings(false)
    }
  }

  const handleUpdateExpense = async () => {
    try {
      setSubmittingExpense(true)
      
      // Validate form
      if (expenseForm.amount <= 0) {
        toast.error('Expense amount must be greater than 0')
                      return
                    }
                    
      const today = new Date().toISOString().split('T')[0]
      console.log('Updating expense for date:', today)
      console.log('Expense form data:', expenseForm)
      console.log('App user ID:', appUser?.id)

      if (todayExpense) {
        // Update existing expense
        console.log('Updating existing expense with ID:', todayExpense.id)
                    const { data, error } = await supabase
                      .from('driver_expenses')
          .update({
            amount: expenseForm.amount,
            expense_type: expenseForm.expense_type
          })
          .eq('id', todayExpense.id)
                      .select()
                    
        console.log('Expense update result:', { data, error })
                    if (error) {
          console.error('Supabase expense update error:', error)
          throw error
        }
                    } else {
        // Create new expense
        console.log('Creating new expense record')
                    const { data, error } = await supabase
                      .from('driver_expenses')
                      .insert({
            driver_id: appUser?.id,
            date: today,
            amount: expenseForm.amount,
            expense_type: expenseForm.expense_type
                      })
                      .select()
                    
        console.log('Expense insert result:', { data, error })
                    if (error) {
          console.error('Supabase expense insert error:', error)
          throw error
        }
      }

      toast.success('Expense updated successfully!')
                      fetchDriverData()
                  } catch (error) {
      console.error('Error updating expense:', error)
      toast.error(`Failed to update expense: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmittingExpense(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading driver data...</p>
        </div>
      </div>
    )
  }

  // Show leave notice if driver is on approved leave
  if (isOnLeave && leaveInfo) {
    return (
      <div className="space-y-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <h2 className="text-lg font-semibold text-orange-900">You are currently on approved leave</h2>
              <p className="text-orange-700">
                Leave Type: <span className="font-medium capitalize">{leaveInfo.leave_type}</span>
              </p>
              <p className="text-orange-700">
                Period: {new Date(leaveInfo.start_date).toLocaleDateString()} - {new Date(leaveInfo.end_date).toLocaleDateString()}
              </p>
              {leaveInfo.admin_notes && (
                <p className="text-orange-700 mt-2">
                  <span className="font-medium">Admin Notes:</span> {leaveInfo.admin_notes}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 p-4 bg-orange-100 rounded-md">
            <p className="text-orange-800 text-sm">
              <strong>Note:</strong> You cannot start work, update earnings, or log expenses while on approved leave. 
              All work-related functions are disabled during this period.
            </p>
          </div>
        </div>
        
        <div className="text-center py-8">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/leave')}
            className="flex items-center mx-auto"
          >
            <Clock className="mr-2 h-4 w-4" />
            View Leave Requests
          </Button>
        </div>
      </div>
    )
  }

  if (!appUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access driver dashboard</p>
        </div>
      </div>
    )
  }

  const isWorking = attendance?.start_time && !attendance?.end_time

  return (
    <div className="space-y-6">
      {/* Car Assignment Warning */}
      {!car && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CarIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                No Car Assigned
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Contact admin to get a car assigned before starting work.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Car Assignment Badge */}
      <div className="flex justify-end">
        <Badge variant="outline" className="flex items-center">
          <CarIcon className="h-3 w-3 mr-1" />
          {car?.plate_number || 'No car assigned'}
        </Badge>
      </div>

      {/* Work Status Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            Work Status
                </CardTitle>
              </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
                    <div>
              <p className="text-sm text-gray-600">
                {attendance?.start_time && !attendance?.end_time ? 'Currently Working' : 'Not Working'}
              </p>
              {attendance?.start_time && (
                <p className="text-xs text-gray-500 mt-1">
                  Started: {attendance.start_time}
                </p>
              )}
                    </div>
            <div className="flex space-x-2">
              {!attendance?.start_time ? (
                <Button 
                  onClick={handleStartWork} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!appUser || !car}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Work
                </Button>
              ) : !attendance?.end_time ? (
                <Button 
                  onClick={handleEndWork} 
                  variant="destructive"
                  disabled={!attendance}
                >
                  <Square className="h-4 w-4 mr-2" />
                  End Work
                </Button>
              ) : (
                <Button disabled variant="outline">
                  Work Completed
                </Button>
              )}
                  </div>
                </div>
              </CardContent>
            </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Update Earnings Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <DollarSign className="h-5 w-5 mr-2 text-green-600" />
              Update Earnings
                </CardTitle>
            <CardDescription>
              Log your daily earnings from rides
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                <Label htmlFor="uber_cash" className="text-xs">Uber Cash</Label>
                                  <Input
                  id="uber_cash"
                  type="number"
                  value={earningsForm.uber_cash}
                  onChange={(e) => setEarningsForm({...earningsForm, uber_cash: Number(e.target.value)})}
                  className="h-9"
                  disabled={!isWorking}
                />
                </div>
                <div>
                <Label htmlFor="uber_account" className="text-xs">Uber Account</Label>
                  <Input
                    id="uber_account"
                    type="number"
                    value={earningsForm.uber_account}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_account: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
                <div>
                <Label htmlFor="bolt_cash" className="text-xs">Bolt Cash</Label>
                  <Input
                    id="bolt_cash"
                    type="number"
                    value={earningsForm.bolt_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_cash: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
                <div>
                <Label htmlFor="bolt_account" className="text-xs">Bolt Account</Label>
                  <Input
                    id="bolt_account"
                    type="number"
                    value={earningsForm.bolt_account}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_account: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
                </div>
                <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Total: AED {earningsForm.uber_cash + earningsForm.uber_account + earningsForm.bolt_cash + earningsForm.bolt_account}
              </span>
                  <Button 
                onClick={handleUpdateEarnings} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                disabled={submittingEarnings || !isWorking}
              >
                {submittingEarnings ? 'Updating...' : 'Update'}
              </Button>
              </div>
            </CardContent>
          </Card>

        {/* Update Expense Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Receipt className="h-5 w-5 mr-2 text-orange-600" />
              Update Expense
              </CardTitle>
            <CardDescription>
              Log your daily expenses
            </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            {/* No Expenses Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="no_expenses"
                checked={noExpenses}
                onChange={(e) => setNoExpenses(e.target.checked)}
                disabled={!isWorking}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <Label htmlFor="no_expenses" className="text-sm font-medium">
                No Expenses Today
              </Label>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="expense_amount" className="text-xs">Amount</Label>
                <Input
                  id="expense_amount"
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: Number(e.target.value)})}
                  className="h-9"
                  disabled={!isWorking || noExpenses}
                />
              </div>
              <div>
                <Label htmlFor="expense_type" className="text-xs">Expense Type</Label>
                <select
                  id="expense_type"
                  value={expenseForm.expense_type}
                  onChange={(e) => setExpenseForm({...expenseForm, expense_type: e.target.value})}
                  className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  disabled={!isWorking || noExpenses}
                >
                  <option value="fuel">Fuel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="food">Food</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <Button 
              onClick={handleUpdateExpense} 
              size="sm" 
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={submittingExpense || !isWorking || noExpenses}
            >
              {submittingExpense ? 'Updating...' : 'Update Expense'}
            </Button>
          </CardContent>
          </Card>
          </div>

      {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/earnings')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Earnings History</h3>
                <p className="text-sm text-gray-600">View past earnings</p>
              </div>
              </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => router.push('/dashboard/expenses')}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Receipt className="h-6 w-6 text-orange-600" />
            </div>
            <div>
                <h3 className="font-semibold">Expense History</h3>
                <p className="text-sm text-gray-600">View past expenses</p>
            </div>
            </div>
          </CardContent>
        </Card>
          </div>
                </div>
  )
}