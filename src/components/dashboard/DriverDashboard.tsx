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
  const { appUser } = useAuth()
  const [car, setCar] = useState<Car | null>(null)
  const [todayEarnings, setTodayEarnings] = useState<DriverEarning | null>(null)
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [attendance, setAttendance] = useState<Attendance | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

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
      fetchDriverData()
    }
  }, [appUser])

  const fetchDriverData = async () => {
    if (!appUser) return

    try {
      // Fetch assigned car
      if (appUser.assigned_car_id) {
        const { data: carData } = await supabase
          .from('cars')
          .select('*')
          .eq('id', appUser.assigned_car_id)
          .single()
        setCar(carData)
      }

      // Fetch today's earnings
      const { data: earningsData } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', appUser.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single()
      setTodayEarnings(earningsData)

      // Fetch recent expenses
      const { data: expensesData } = await supabase
        .from('driver_expenses')
        .select('*')
        .eq('driver_id', appUser.id)
        .order('date', { ascending: false })
        .limit(10)
      setExpenses(expensesData || [])

      // Fetch today's attendance
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('driver_id', appUser.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single()
      setAttendance(attendanceData)

    } catch (error) {
      console.error('Error fetching driver data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEarnings = async () => {
    if (!appUser) return

    try {
      const { error } = await supabase
        .from('driver_earnings')
        .upsert({
          driver_id: appUser.id,
          date: new Date().toISOString().split('T')[0],
          ...earningsForm
        })

      if (error) throw error

      toast.success('Earnings saved successfully')
      fetchDriverData()
    } catch (error) {
      console.error('Error saving earnings:', error)
      toast.error('Failed to save earnings')
    }
  }

  const handleSubmitExpense = async () => {
    if (!appUser) return

    try {
      const { error } = await supabase
        .from('driver_expenses')
        .insert({
          driver_id: appUser.id,
          date: new Date().toISOString().split('T')[0],
          ...expenseForm
        })

      if (error) throw error

      toast.success('Expense submitted successfully')
      setShowExpenseDialog(false)
      setExpenseForm({ expense_type: '', amount: 0, proof_url: '' })
      fetchDriverData()
    } catch (error) {
      console.error('Error submitting expense:', error)
      toast.error('Failed to submit expense')
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
    if (!appUser) return

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          driver_id: appUser.id,
          date: new Date().toISOString().split('T')[0],
          start_time: new Date().toTimeString().split(' ')[0],
          status: 'present'
        })

      if (error) throw error

      toast.success('Start time recorded')
      fetchDriverData()
    } catch (error) {
      console.error('Error recording start time:', error)
      toast.error('Failed to record start time')
    }
  }

  const handleEndTime = async () => {
    if (!appUser) return

    try {
      const { error } = await supabase
        .from('attendance')
        .upsert({
          driver_id: appUser.id,
          date: new Date().toISOString().split('T')[0],
          end_time: new Date().toTimeString().split(' ')[0],
          status: 'present'
        })

      if (error) throw error

      toast.success('End time recorded')
      fetchDriverData()
    } catch (error) {
      console.error('Error recording end time:', error)
      toast.error('Failed to record end time')
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
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button>Add Expense</Button>
              </DialogTrigger>
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
                        <SelectItem value="Fuel">Fuel</SelectItem>
                        <SelectItem value="Car Maintenance">Car Maintenance</SelectItem>
                        <SelectItem value="Toll Fees">Toll Fees</SelectItem>
                        <SelectItem value="Parking">Parking</SelectItem>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Phone Bill">Phone Bill</SelectItem>
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
                  <Button onClick={handleSubmitExpense} className="w-full">
                    Submit Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                  <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Request Leave</Button>
                    </DialogTrigger>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
