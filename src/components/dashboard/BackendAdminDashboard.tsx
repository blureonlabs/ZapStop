'use client'

import { useState, useMemo } from 'react'
import { useUsers, useCars, useOwners, useEarnings, useExpenses, useAttendance, useDashboardData } from '@/hooks/useApi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt, Building2, Users, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { DashboardSkeleton } from '@/components/ui/loading-skeleton'

export default function BackendAdminDashboard() {
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly')
  
  // Use API hooks - prioritize analytics data first, then load other data
  const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useDashboardData(timeFilter)
  const { data: users, loading: usersLoading, error: usersError } = useUsers()
  const { data: cars, loading: carsLoading, error: carsError } = useCars()
  const { data: owners, loading: ownersLoading, error: ownersError } = useOwners()
  const { data: earnings, loading: earningsLoading, error: earningsError } = useEarnings()
  const { data: expenses, loading: expensesLoading, error: expensesError } = useExpenses()
  const { data: attendance, loading: attendanceLoading, error: attendanceError } = useAttendance()
  
  // Filter drivers from users
  const drivers = users?.filter(user => user.role === 'driver') || []
  
  // Show dashboard as soon as analytics data is loaded, load other data in background
  const loading = analyticsLoading
  const backgroundLoading = usersLoading || carsLoading || ownersLoading || earningsLoading || expensesLoading || attendanceLoading

  // Use analytics data from backend
  const stats = useMemo(() => {
    if (!analyticsData) return {
      totalDrivers: 0,
      activeDrivers: 0,
      totalCars: 0,
      availableCars: 0,
      totalEarnings: 0,
      totalExpenses: 0,
      netProfit: 0,
      pendingLeaveRequests: 0,
      pendingExpenseRequests: 0
    }

    return {
      totalDrivers: analyticsData?.company_stats?.total_drivers || 0,
      activeDrivers: analyticsData?.company_stats?.active_drivers || 0,
      totalCars: analyticsData?.company_stats?.total_cars || 0,
      availableCars: analyticsData?.company_stats?.total_cars || 0, // Using total_cars as available_cars for now
      totalEarnings: analyticsData?.summary?.total_earnings || 0,
      totalExpenses: analyticsData?.summary?.total_expenses || 0,
      netProfit: analyticsData?.summary?.net_profit || 0,
      pendingLeaveRequests: 0, // Not available in current analytics
      pendingExpenseRequests: 0 // Not available in current analytics
    }
  }, [analyticsData])

  // Calculate additional stats from raw data
  const additionalStats = useMemo(() => {
    const totalEarningsAmount = earnings?.reduce((sum, earning) => 
      sum + (earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + 
             earning.individual_rides_cash + earning.individual_rides_account), 0) || 0

    const totalExpensesAmount = expenses?.reduce((sum, expense) => 
      sum + expense.amount, 0) || 0

    const pendingExpenses = expenses?.filter(expense => expense.status === 'pending').length || 0
    const approvedExpenses = expenses?.filter(expense => expense.status === 'approved').length || 0
    const rejectedExpenses = expenses?.filter(expense => expense.status === 'rejected').length || 0

    const presentToday = attendance?.filter(att => 
      att.status === 'present' && 
      new Date(att.date).toDateString() === new Date().toDateString()
    ).length || 0

    return {
      totalEarningsAmount,
      totalExpensesAmount,
      netProfit: totalEarningsAmount - totalExpensesAmount,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      presentToday
    }
  }, [earnings, expenses, attendance])

  // Chart data
  const earningsChartData = useMemo(() => {
    if (!earnings) return []
    
    const dailyEarnings = earnings.reduce((acc, earning) => {
      const date = new Date(earning.date).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { date, total: 0, uber: 0, bolt: 0, individual: 0 }
      }
      acc[date].total += earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + 
                        earning.individual_rides_cash + earning.individual_rides_account
      acc[date].uber += earning.uber_cash + earning.uber_account
      acc[date].bolt += earning.bolt_cash + earning.bolt_account
      acc[date].individual += earning.individual_rides_cash + earning.individual_rides_account
      return acc
    }, {} as Record<string, { date: string; total: number; uber: number; bolt: number; individual: number }>)

    return Object.values(dailyEarnings).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [earnings])

  const expensesChartData = useMemo(() => {
    if (!expenses) return []
    
    const expenseTypes = expenses.reduce((acc, expense) => {
      if (!acc[expense.expense_type]) {
        acc[expense.expense_type] = 0
      }
      acc[expense.expense_type] += expense.amount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(expenseTypes).map(([type, amount]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      amount
    }))
  }, [expenses])

  const carStatusData = useMemo(() => {
    if (!cars) return []
    
    const statusCounts = cars.reduce((acc, car) => {
      const status = car.assigned_driver_id ? 'assigned' : 'available'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count
    }))
  }, [cars])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) {
    return <DashboardSkeleton />
  }

  if (analyticsError) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">There was an error loading the dashboard data.</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of your rental car business</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as typeof timeFilter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrivers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeDrivers} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCars}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableCars} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${additionalStats.totalEarningsAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Net profit: ${additionalStats.netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaveRequests + additionalStats.pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingLeaveRequests} leave, {additionalStats.pendingExpenses} expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="cars">Cars</TabsTrigger>
        </TabsList>
        
        {backgroundLoading && (
          <div className="text-center py-4 text-sm text-gray-500">
            Loading additional data...
          </div>
        )}

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
              <CardDescription>Daily earnings breakdown by platform</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  Loading earnings data...
                </div>
              ) : earningsChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={earningsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="uber" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="bolt" stroke="#ffc658" strokeWidth={2} />
                      <Line type="monotone" dataKey="individual" stroke="#ff7300" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No earnings data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Type</CardTitle>
              <CardDescription>Breakdown of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  Loading expenses data...
                </div>
              ) : expensesChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, amount }) => `${type}: $${amount.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {expensesChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No expenses data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cars" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Car Status Distribution</CardTitle>
              <CardDescription>Current status of all cars in the fleet</CardDescription>
            </CardHeader>
            <CardContent>
              {carsLoading ? (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  Loading cars data...
                </div>
              ) : carStatusData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={carStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500">
                  No cars data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Earnings</CardTitle>
            <CardDescription>Latest driver earnings</CardDescription>
          </CardHeader>
          <CardContent>
            {earningsLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading earnings data...
              </div>
            ) : earnings && earnings.length > 0 ? (
              <div className="space-y-4">
                {earnings.slice(0, 5).map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Driver {earning.driver_id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-500">{new Date(earning.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${(earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{earning.uber_rides_count + earning.bolt_rides_count + earning.individual_rides_count} rides</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No earnings data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Latest driver expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading expenses data...
              </div>
            ) : expenses && expenses.length > 0 ? (
              <div className="space-y-4">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{expense.expense_type}</p>
                      <p className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${expense.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500 capitalize">{expense.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No expenses data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
