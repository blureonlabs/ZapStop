'use client'

import { useState, useMemo } from 'react'
import { useExpenses, useEarnings, useUsers, useCars, useApproveExpense, useRejectExpense } from '@/hooks/useApi'
import { DriverExpense, DriverEarning, User, Car } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Receipt, Users, TrendingUp, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function AccountantDashboard() {
  const [selectedExpense, setSelectedExpense] = useState<DriverExpense | null>(null)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)

  // Use API hooks
  const { data: expenses, loading: expensesLoading, refetch: refetchExpenses } = useExpenses()
  const { data: earnings, loading: earningsLoading } = useEarnings()
  const { data: users, loading: usersLoading } = useUsers()
  const { data: cars, loading: carsLoading } = useCars()
  const { mutate: approveExpense, loading: approveLoading } = useApproveExpense()
  const { mutate: rejectExpense, loading: rejectLoading } = useRejectExpense()

  const loading = expensesLoading || earningsLoading || usersLoading || carsLoading
  const drivers = users?.filter(user => user.role === 'driver') || []

  const handleExpenseAction = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') {
        await approveExpense(expenseId)
        toast.success('Expense approved successfully')
      } else {
        await rejectExpense(expenseId)
        toast.success('Expense rejected successfully')
      }
      refetchExpenses()
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    }
  }

  const handleViewExpense = (expense: DriverExpense) => {
    setSelectedExpense(expense)
    setShowExpenseDialog(true)
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0
    const totalEarnings = earnings?.reduce((sum, earning) => 
      sum + earning.uber_cash + earning.uber_account + earning.bolt_cash + 
      earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account, 0) || 0
    const pendingExpenses = expenses?.filter(expense => expense.status === 'pending').length || 0
    const approvedExpenses = expenses?.filter(expense => expense.status === 'approved').length || 0
    const rejectedExpenses = expenses?.filter(expense => expense.status === 'rejected').length || 0

    return {
      totalExpenses,
      totalEarnings,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      netProfit: totalEarnings - totalExpenses
    }
  }, [expenses, earnings])

  // Chart data
  const expenseChartData = useMemo(() => {
    const monthlyData: { [key: string]: { month: string; expenses: number; earnings: number } } = {}
    
    expenses?.forEach(expense => {
      const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short' })
      if (!monthlyData[month]) {
        monthlyData[month] = { month, expenses: 0, earnings: 0 }
      }
      if (expense.status === 'approved') {
        monthlyData[month].expenses += expense.amount
      }
    })

    earnings?.forEach(earning => {
      const month = new Date(earning.date).toLocaleDateString('en-US', { month: 'short' })
      if (!monthlyData[month]) {
        monthlyData[month] = { month, expenses: 0, earnings: 0 }
      }
      monthlyData[month].earnings += earning.uber_cash + earning.uber_account + 
        earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account
    })

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.month + ' 1, 2024').getTime() - new Date(b.month + ' 1, 2024').getTime()
    )
  }, [expenses, earnings])

  const expenseStatusData = useMemo(() => [
    { name: 'Approved', value: stats.approvedExpenses, color: '#10b981' },
    { name: 'Pending', value: stats.pendingExpenses, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejectedExpenses, color: '#ef4444' }
  ], [stats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.netProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingExpenses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses vs Earnings</CardTitle>
            <CardDescription>Comparison of monthly expenses and earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Bar dataKey="earnings" fill="#10b981" name="Earnings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Status Distribution</CardTitle>
            <CardDescription>Breakdown of expense approval status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Management */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Management</CardTitle>
          <CardDescription>Review and approve driver expense requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending ({stats.pendingExpenses})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({stats.approvedExpenses})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejectedExpenses})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              <div className="space-y-2">
                {expenses?.filter(expense => expense.status === 'pending').map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{expense.expense_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {expense.users?.name} • ${expense.amount} • {new Date(expense.date).toLocaleDateString()}
                      </div>
                      {expense.description && (
                        <div className="text-sm text-muted-foreground">{expense.description}</div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewExpense(expense)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExpenseAction(expense.id, 'approved')}
                        disabled={approveLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleExpenseAction(expense.id, 'rejected')}
                        disabled={rejectLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
                {stats.pendingExpenses === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending expenses
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              <div className="space-y-2">
                {expenses?.filter(expense => expense.status === 'approved').map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{expense.expense_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {expense.users?.name} • ${expense.amount} • {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  </div>
                ))}
                {stats.approvedExpenses === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No approved expenses
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              <div className="space-y-2">
                {expenses?.filter(expense => expense.status === 'rejected').map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{expense.expense_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {expense.users?.name} • ${expense.amount} • {new Date(expense.date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Rejected
                    </Badge>
                  </div>
                ))}
                {stats.rejectedExpenses === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No rejected expenses
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Expense Detail Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              Review the expense request details and supporting documents
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Driver</label>
                  <p className="text-sm text-muted-foreground">{selectedExpense.users?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-muted-foreground">${selectedExpense.amount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedExpense.expense_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Date</label>
                  <p className="text-sm text-muted-foreground">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={selectedExpense.status === 'approved' ? 'default' : selectedExpense.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {selectedExpense.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">{selectedExpense.category || 'N/A'}</p>
                </div>
              </div>
              {selectedExpense.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
                </div>
              )}
              {selectedExpense.proof_url && (
                <div>
                  <label className="text-sm font-medium">Proof Document</label>
                  <div className="mt-2">
                    <a 
                      href={selectedExpense.proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                </div>
              )}
              {selectedExpense.admin_notes && (
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <p className="text-sm text-muted-foreground">{selectedExpense.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}