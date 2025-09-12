'use client'

import { useState, useEffect, useCallback } from 'react'
import { useBackendAuth } from '@/contexts/BackendAuthContext'
import { apiService, Car, DriverEarning, DriverExpense, Attendance, LeaveRequest } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CarIcon, DollarSign, Receipt, Play, Square, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { DashboardSkeleton } from '@/components/ui/loading-skeleton'

export default function BackendDriverDashboard() {
  const { user, loading: authLoading } = useBackendAuth()
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
    bolt_account: 0,
    uber_rides_count: 0,
    bolt_rides_count: 0,
    individual_rides_count: 0,
    individual_rides_cash: 0,
    individual_rides_account: 0
  })

  const [expenseForm, setExpenseForm] = useState({
    amount: 0,
    expense_type: 'fuel'
  })
  const [noExpenses, setNoExpenses] = useState(false)

  const checkLeaveStatus = async (driverId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const leaveRequests = await apiService.getLeaveRequests(driverId, 'approved')
      
      const activeLeave = leaveRequests.find(leave => 
        leave.start_date <= today && leave.end_date >= today
      )

      if (activeLeave) {
        setIsOnLeave(true)
        setLeaveInfo(activeLeave)
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
      if (!user?.id) return

      // Check if driver is on approved leave
      await checkLeaveStatus(user.id)

      // Get the driver's assigned car
      try {
        const assignedCar = await apiService.getMyCar()
        console.log('BackendDriverDashboard - Found assigned car:', assignedCar)
        setCar(assignedCar)
      } catch (error) {
        console.log('BackendDriverDashboard - No car assigned to this driver:', error)
        setCar(null)
      }

      // Fetch today's earnings
      const today = new Date().toISOString().split('T')[0]
      const earnings = await apiService.getEarnings(user.id)
      const todayEarningsData = earnings.find(e => e.date === today)
      
      if (todayEarningsData) {
        setTodayEarnings(todayEarningsData)
        setEarningsForm({
          uber_cash: todayEarningsData.uber_cash || 0,
          uber_account: todayEarningsData.uber_account || 0,
          bolt_cash: todayEarningsData.bolt_cash || 0,
          bolt_account: todayEarningsData.bolt_account || 0,
          uber_rides_count: todayEarningsData.uber_rides_count || 0,
          bolt_rides_count: todayEarningsData.bolt_rides_count || 0,
          individual_rides_count: todayEarningsData.individual_rides_count || 0,
          individual_rides_cash: todayEarningsData.individual_rides_cash || 0,
          individual_rides_account: todayEarningsData.individual_rides_account || 0
        })
      } else {
        setTodayEarnings(null)
      }

      // Fetch today's expenses
      const expenses = await apiService.getExpenses(user.id)
      const todayExpenseData = expenses.find(e => e.date === today)
      setTodayExpense(todayExpenseData || null)

      // Fetch today's attendance
      const attendanceData = await apiService.getAttendance(user.id)
      console.log('BackendDriverDashboard - Attendance data:', attendanceData)
      console.log('BackendDriverDashboard - Looking for date:', today)
      
      // Find attendance for today, handling timezone differences
      const todayAttendance = attendanceData.find(a => {
        const attendanceDate = new Date(a.date).toISOString().split('T')[0]
        return attendanceDate === today
      })
      console.log('BackendDriverDashboard - Today attendance:', todayAttendance)
      setAttendance(todayAttendance || null)

    } catch (error) {
      console.error('Error fetching driver data:', error)
      toast.error('Failed to load driver data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchDriverData()
    }
  }, [user, fetchDriverData])

  const handleStartWork = async () => {
    try {
      if (!user?.id) {
        toast.error('User not authenticated')
        return
      }

      await apiService.startWork()
      toast.success('Work started successfully!')
      setNoExpenses(false)
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

      await apiService.endWork()
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
          earningsForm.bolt_cash < 0 || earningsForm.bolt_account < 0 ||
          earningsForm.uber_rides_count < 0 || earningsForm.bolt_rides_count < 0 || 
          earningsForm.individual_rides_count < 0 || earningsForm.individual_rides_cash < 0 || 
          earningsForm.individual_rides_account < 0) {
        toast.error('Earnings and ride counts cannot be negative')
        return
      }

      // Call the backend API to update earnings
      const today = new Date().toISOString().split('T')[0]
      const earningsData = {
        date: today,
        driver_id: user.id,
        ...earningsForm
      }
      
      if (todayEarnings) {
        await apiService.updateEarning(todayEarnings.id, earningsData)
      } else {
        await apiService.createEarning(earningsData)
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

      // Call the backend API to update expenses
      const today = new Date().toISOString().split('T')[0]
      const expenseData = {
        date: today,
        driver_id: user.id,
        amount: expenseForm.amount,
        expense_type: expenseForm.expense_type,
        description: `Daily ${expenseForm.expense_type} expense`
      }
      
      if (todayExpense) {
        await apiService.updateExpense(todayExpense.id, expenseData)
      } else {
        await apiService.createExpense(expenseData)
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

  if (authLoading || loading) {
    return <DashboardSkeleton />
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

  if (!user) {
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
                  disabled={!user || !car}
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
            <div className="space-y-4">
              {/* Uber Section */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="uber_rides_count" className="text-xs">Uber Rides</Label>
                  <Input
                    id="uber_rides_count"
                    type="number"
                    value={earningsForm.uber_rides_count}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_rides_count: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
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
              </div>

              {/* Bolt Section */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="bolt_rides_count" className="text-xs">Bolt Rides</Label>
                  <Input
                    id="bolt_rides_count"
                    type="number"
                    value={earningsForm.bolt_rides_count}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_rides_count: Number(e.target.value)})}
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

              {/* Individual Section */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="individual_rides_count" className="text-xs">Individual Rides</Label>
                  <Input
                    id="individual_rides_count"
                    type="number"
                    value={earningsForm.individual_rides_count}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_rides_count: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
                <div>
                  <Label htmlFor="individual_rides_cash" className="text-xs">Individual Rides Cash</Label>
                  <Input
                    id="individual_rides_cash"
                    type="number"
                    value={earningsForm.individual_rides_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_rides_cash: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
                <div>
                  <Label htmlFor="individual_rides_account" className="text-xs">Individual Rides Account</Label>
                  <Input
                    id="individual_rides_account"
                    type="number"
                    value={earningsForm.individual_rides_account}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_rides_account: Number(e.target.value)})}
                    className="h-9"
                    disabled={!isWorking}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Total: AED {earningsForm.uber_cash + earningsForm.uber_account + earningsForm.bolt_cash + earningsForm.bolt_account + earningsForm.individual_rides_cash + earningsForm.individual_rides_account}
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
