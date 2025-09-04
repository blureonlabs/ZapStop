'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, DriverExpense, DriverEarning, User, Car } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Receipt, Users, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function AccountantDashboard() {
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [earnings, setEarnings] = useState<DriverEarning[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExpense, setSelectedExpense] = useState<DriverExpense | null>(null)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = useCallback(async () => {
    try {
      // Fetch all expenses
      const { data: expensesData } = await supabase
        .from('driver_expenses')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('created_at', { ascending: false })

      // Fetch all earnings
      const { data: earningsData } = await supabase
        .from('driver_earnings')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('date', { ascending: false })

      // Fetch all drivers
      const { data: driversData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver')

      setExpenses(expensesData || [])
      setEarnings(earningsData || [])
      setDrivers(driversData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleExpenseAction = async (expenseId: string, status: 'approved' | 'rejected') => {
    if (processing) return
    
    try {
      setProcessing(true)
      
      const { error } = await supabase
        .from('driver_expenses')
        .update({ status })
        .eq('id', expenseId)

      if (error) throw error

      toast.success(`Expense ${status} successfully`)
      setShowExpenseDialog(false)
      setSelectedExpense(null)
      fetchData()
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    } finally {
      setProcessing(false)
    }
  }

  const expenseStats = useMemo(() => {
    const total = expenses.length
    const pending = expenses.filter(e => e.status === 'pending').length
    const approved = expenses.filter(e => e.status === 'approved').length
    const rejected = expenses.filter(e => e.status === 'rejected').length
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
    const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)

    return { total, pending, approved, rejected, totalAmount, approvedAmount }
  }, [expenses])

  const earningsStats = useMemo(() => {
    const totalEarnings = earnings.reduce((sum, e) => 
      sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_cash, 0)
    
    const uberEarnings = earnings.reduce((sum, e) => sum + e.uber_cash + e.uber_account, 0)
    const boltEarnings = earnings.reduce((sum, e) => sum + e.bolt_cash + e.bolt_account, 0)
    const individualEarnings = earnings.reduce((sum, e) => sum + e.individual_cash, 0)

    return { totalEarnings, uberEarnings, boltEarnings, individualEarnings }
  }, [earnings])

  const driverStats = useMemo(() => {
    return drivers.map(driver => {
      const driverEarnings = earnings.filter(e => e.driver_id === driver.id)
      const totalEarnings = driverEarnings.reduce((sum, e) => 
        sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_cash, 0)
      
      const driverExpenses = expenses.filter(e => e.driver_id === driver.id)
      const totalExpenses = driverExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)

      return {
        name: driver.name,
        earnings: totalEarnings,
        expenses: totalExpenses,
        net: totalEarnings - totalExpenses
      }
    })
  }, [drivers, earnings, expenses])

  const earningsByType = useMemo(() => {
    return [
      { name: 'Uber', value: earningsStats.uberEarnings, color: '#3b82f6' },
      { name: 'Bolt', value: earningsStats.boltEarnings, color: '#10b981' },
      { name: 'Individual', value: earningsStats.individualEarnings, color: '#f59e0b' }
    ]
  }, [earningsStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Memoized values are already calculated above

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {expenseStats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {expenseStats.total} total expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {earningsStats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All driver earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">
              Total drivers
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses">Expense Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Approvals</CardTitle>
              <CardDescription>
                Review and approve driver expense submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(expense as { users?: { name?: string } }).users?.name || 'Unknown'}
                        </td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {expense.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedExpense(expense)
                                  setShowExpenseDialog(true)
                                }}
                              >
                                Review
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={earningsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {earningsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Driver Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={driverStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>
                Overview of all financial activities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    AED {earningsStats.totalEarnings.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">Total Earnings</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    AED {expenseStats.approvedAmount.toLocaleString()}
                  </div>
                  <div className="text-sm text-red-600">Approved Expenses</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    AED {(earningsStats.totalEarnings - expenseStats.approvedAmount).toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Net Profit</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Driver Performance Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Driver</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Earnings</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Expenses</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {driverStats.map((driver, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{driver.name}</td>
                          <td className="px-4 py-2 text-sm text-green-600">AED {driver.earnings.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-red-600">AED {driver.expenses.toLocaleString()}</td>
                          <td className={`px-4 py-2 text-sm font-medium ${driver.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            AED {driver.net.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Review Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Expense</DialogTitle>
            <DialogDescription>
              Review the expense details and approve or reject
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Driver</label>
                  <p className="text-sm">{(selectedExpense as { users?: { name?: string } }).users?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-sm">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="text-sm">{selectedExpense.expense_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Amount</label>
                  <p className="text-sm font-semibold">AED {selectedExpense.amount.toLocaleString()}</p>
                </div>
              </div>
              {selectedExpense.proof_url && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Proof</label>
                  <p className="text-sm">
                    <a href={selectedExpense.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      View Proof
                    </a>
                  </p>
                </div>
              )}
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleExpenseAction(selectedExpense.id, 'approved')}
                  className="flex-1"
                  variant="default"
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  onClick={() => handleExpenseAction(selectedExpense.id, 'rejected')}
                  className="flex-1"
                  variant="destructive"
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {processing ? 'Processing...' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
