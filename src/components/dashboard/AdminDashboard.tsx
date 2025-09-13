'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useUsers, useCars, useOwners, useEarnings, useExpenses, useAttendance, useDashboardData } from '@/hooks/useApi'
import { User, Car, DriverEarning, DriverExpense, Attendance, AnalyticsData } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { DashboardSkeleton } from '@/components/ui/loading-skeleton'

export default function AdminDashboard() {
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly')
  
  // Use API hooks
  const { data: users, loading: usersLoading } = useUsers()
  const { data: cars, loading: carsLoading } = useCars()
  const { data: owners, loading: ownersLoading } = useOwners()
  const { data: earnings, loading: earningsLoading } = useEarnings()
  const { data: expenses, loading: expensesLoading } = useExpenses()
  const { data: attendance, loading: attendanceLoading } = useAttendance()
  const { data: analyticsData, loading: analyticsLoading } = useDashboardData(timeFilter)
  
  // Filter drivers from users
  const drivers = users?.filter(user => user.role === 'driver') || []
  
  const loading = usersLoading || carsLoading || ownersLoading || earningsLoading || expensesLoading || attendanceLoading || analyticsLoading


  const getDateRange = (filter: string) => {
    const now = new Date()
    const start = new Date()
    
    switch (filter) {
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
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    }
  }

  // Data is already fetched by API hooks


  const companyStats = useMemo(() => {
    const totalCars = cars?.length || 0
    const totalOwners = owners?.length || 0
    const totalActiveDrivers = attendance?.filter(a => a.start_time && !a.end_time).length || 0
    
    // Get date range based on filter
    const dateRange = getDateRange(timeFilter)
    
    // Filter earnings and expenses based on time period
    const filteredEarnings = earnings?.filter(e => e.date >= dateRange.start && e.date <= dateRange.end) || []
    const filteredExpenses = expenses?.filter(e => e.status === 'approved' && e.date >= dateRange.start && e.date <= dateRange.end) || []
    
    const totalMandatoryDues = totalCars * 7500
    const totalEarnings = filteredEarnings.reduce((sum, e) => 
      sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0)
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const netProfit = totalEarnings - totalMandatoryDues - totalExpenses

    return { 
      totalCars, 
      totalOwners, 
      totalActiveDrivers,
      totalMandatoryDues, 
      totalEarnings, 
      totalExpenses, 
      netProfit 
    }
  }, [cars?.length, owners?.length, attendance?.length, earnings?.length, expenses?.length, timeFilter])

  const carLevelPL = useMemo(() => {
    const dateRange = getDateRange(timeFilter)
    const filteredEarnings = earnings?.filter(e => e.date >= dateRange.start && e.date <= dateRange.end) || []
    const filteredExpenses = expenses?.filter(e => e.status === 'approved' && e.date >= dateRange.start && e.date <= dateRange.end) || []
    
    return cars?.map(car => {
      const carEarnings = filteredEarnings.filter(e => {
        const driver = drivers?.find(d => d.id === e.driver_id)
        return driver?.assigned_car_id === car.id
      }).reduce((sum, e) => 
        sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0)
      
      const carExpenses = filteredExpenses.filter(e => {
        const driver = drivers?.find(d => d.id === e.driver_id)
        return driver?.assigned_car_id === car.id
      }).reduce((sum, e) => sum + e.amount, 0)

      return {
        car: car.plate_number,
        earnings: carEarnings,
        expenses: carExpenses,
        net: carEarnings - carExpenses,
        due: car.monthly_due
      }
    }) || []
  }, [cars, earnings, expenses, drivers, timeFilter])

  const driverLevelPL = useMemo(() => {
    const dateRange = getDateRange(timeFilter)
    const filteredEarnings = earnings?.filter(e => e.date >= dateRange.start && e.date <= dateRange.end) || []
    const filteredExpenses = expenses?.filter(e => e.status === 'approved' && e.date >= dateRange.start && e.date <= dateRange.end) || []
    
    return drivers?.map(driver => {
      const driverEarnings = filteredEarnings.filter(e => e.driver_id === driver.id)
        .reduce((sum, e) => 
          sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0)
      
      const driverExpenses = filteredExpenses.filter(e => e.driver_id === driver.id)
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        driver: driver.name,
        earnings: driverEarnings,
        expenses: driverExpenses,
        net: driverEarnings - driverExpenses
      }
    }) || []
  }, [drivers, earnings, expenses, timeFilter])

  const earningsByPlatform = useMemo(() => {
    const dateRange = getDateRange(timeFilter)
    const filteredEarnings = earnings?.filter(e => e.date >= dateRange.start && e.date <= dateRange.end) || []
    
    const uberEarnings = filteredEarnings.reduce((sum, e) => sum + e.uber_cash + e.uber_account, 0)
    const boltEarnings = filteredEarnings.reduce((sum, e) => sum + e.bolt_cash + e.bolt_account, 0)
    const individualEarnings = filteredEarnings.reduce((sum, e) => sum + e.individual_rides_cash + e.individual_rides_account, 0)

    return [
      { name: 'Uber', value: uberEarnings, color: '#3b82f6' },
      { name: 'Bolt', value: boltEarnings, color: '#10b981' },
      { name: 'Individual', value: individualEarnings, color: '#f59e0b' }
    ]
  }, [earnings, timeFilter])

  const dailyTrends = useMemo(() => {
    const dateRange = getDateRange(timeFilter)
    const startDate = new Date(dateRange.start)
    const endDate = new Date(dateRange.end)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const days = Array.from({ length: Math.min(daysDiff + 1, 30) }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      return date.toISOString().split('T')[0]
    })

    return days.map(date => {
      const dayEarnings = earnings?.filter(e => e.date === date)
        .reduce((sum, e) => 
          sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0) || 0
      
      const dayExpenses = expenses?.filter(e => e.date === date && e.status === 'approved')
        .reduce((sum, e) => sum + e.amount, 0) || 0

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        earnings: dayEarnings,
        expenses: dayExpenses,
        net: dayEarnings - dayExpenses
      }
    })
  }, [earnings, expenses, timeFilter])


  if (loading) {
    return <DashboardSkeleton />
  }

  // Memoized values are already calculated above

  return (
    <div className="space-y-6">


      {/* Company KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.totalCars}</div>
            <p className="text-xs text-muted-foreground">
              Active vehicles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.totalOwners}</div>
            <p className="text-xs text-muted-foreground">
              Registered owners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Drivers</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.totalActiveDrivers}</div>
            <p className="text-xs text-muted-foreground">
              Active drivers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Separation */}
      <div className="border-t border-gray-200 my-8"></div>

      {/* Time Filter */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Financial Overview</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Time Period:</span>
          <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as typeof timeFilter)}>
            <SelectTrigger className="w-32">
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

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Dues</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {companyStats.totalMandatoryDues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {companyStats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {companyStats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Approved expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${companyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              AED {companyStats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              After dues & expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings vs Dues vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Line type="monotone" dataKey="earnings" stroke="#3b82f6" name="Earnings" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                    <Line type="monotone" dataKey="net" stroke="#10b981" name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uber vs Bolt vs Individual Split</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={earningsByPlatform}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {earningsByPlatform.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Car-Level P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={carLevelPL}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="car" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    <Bar dataKey="net" fill="#10b981" name="Net" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Driver-Level P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={driverLevelPL}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="driver" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    <Bar dataKey="net" fill="#10b981" name="Net" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recovery Progress</CardTitle>
                <CardDescription>Progress towards monthly dues per car</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {carLevelPL.map((car, index) => {
                  const progress = Math.min((car.earnings / car.due) * 100, 100)
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{car.car}</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>AED {car.earnings.toLocaleString()}</span>
                        <span>AED {car.due.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      AED {companyStats.totalEarnings.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">Total Earnings</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      AED {companyStats.totalExpenses.toLocaleString()}
                    </div>
                    <div className="text-sm text-red-600">Total Expenses</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className={`text-3xl font-bold ${companyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    AED {companyStats.netProfit.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Net Profit/Loss</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

    </div>
  )
}
