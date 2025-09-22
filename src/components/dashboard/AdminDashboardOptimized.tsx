'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt, Building2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { DashboardSkeleton } from '@/components/ui/loading-skeleton'
import { dashboardAPI, exportAPI } from '@/lib/edge-functions'

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

export default function AdminDashboardOptimized() {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly')
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      console.log('Fetching dashboard data with Edge Functions...')
      const startTime = performance.now()
      
      const data = await dashboardAPI.getStats(timeFilter)
      
      const endTime = performance.now()
      console.log(`Dashboard data fetched in ${(endTime - startTime).toFixed(2)}ms`)
      
      setDashboardData(data)
      
      if (showRefresh) {
        toast.success('Dashboard data refreshed successfully!')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [timeFilter])

  useEffect(() => {
    fetchDashboardData()
  }, [timeFilter, fetchDashboardData])

  const handleExport = async (type: 'earnings' | 'expenses' | 'attendance' | 'all', format: 'csv' | 'json' = 'json') => {
    try {
      const dateFrom = new Date()
      const dateTo = new Date()
      
      // Set date range based on time filter
      switch (timeFilter) {
        case 'daily':
          dateFrom.setDate(dateTo.getDate() - 1)
          break
        case 'weekly':
          dateFrom.setDate(dateTo.getDate() - 7)
          break
        case 'monthly':
          dateFrom.setMonth(dateTo.getMonth() - 1)
          break
        case '3months':
          dateFrom.setMonth(dateTo.getMonth() - 3)
          break
        case '6months':
          dateFrom.setMonth(dateTo.getMonth() - 6)
          break
        case 'yearly':
          dateFrom.setFullYear(dateTo.getFullYear() - 1)
          break
      }

      const dateFromStr = dateFrom.toISOString().split('T')[0]
      const dateToStr = dateTo.toISOString().split('T')[0]

      let result
      if (type === 'all') {
        result = await exportAPI.exportAll(dateFromStr, dateToStr, format)
      } else if (type === 'earnings') {
        result = await exportAPI.exportEarnings(dateFromStr, dateToStr, undefined, format)
      } else if (type === 'expenses') {
        result = await exportAPI.exportExpenses(dateFromStr, dateToStr, undefined, format)
      } else if (type === 'attendance') {
        result = await exportAPI.exportAttendance(dateFromStr, dateToStr, undefined, format)
      }

      if (format === 'csv' && result.data) {
        // Download CSV file
        const blob = new Blob([result.data], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename || `${type}_export.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success(`${type} data exported successfully!`)
      } else {
        // For JSON, you could show a modal or download as JSON
        console.log('Export data:', result)
        toast.success(`${type} data exported successfully!`)
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Failed to Load Dashboard</h2>
        <p className="text-gray-600 mb-4">Unable to load dashboard data. Please try again.</p>
        <Button onClick={() => fetchDashboardData()}>Retry</Button>
      </div>
    )
  }

  const { companyStats, carLevelPL, driverLevelPL, earningsByPlatform, earningsByDate, expensesByType } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Real-time analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={(value: any) => setTimeFilter(value)}>
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
          <Button 
            onClick={() => fetchDashboardData(true)} 
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={() => handleExport('all', 'csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.totalCars}</div>
            <p className="text-xs text-muted-foreground">
              {companyStats.totalOwners} owners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.totalActiveDrivers}</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${companyStats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Mandatory dues: ${companyStats.totalMandatoryDues.toLocaleString()}
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
              ${companyStats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Expenses: ${companyStats.totalExpenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Earnings Analysis</TabsTrigger>
          <TabsTrigger value="cars">Car Performance</TabsTrigger>
          <TabsTrigger value="drivers">Driver Performance</TabsTrigger>
          <TabsTrigger value="expenses">Expense Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings by Platform</CardTitle>
                <CardDescription>Distribution of earnings across platforms</CardDescription>
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
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Over Time</CardTitle>
                <CardDescription>Daily earnings trend</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Line type="monotone" dataKey="uber" stroke="#3b82f6" name="Uber" />
                    <Line type="monotone" dataKey="bolt" stroke="#10b981" name="Bolt" />
                    <Line type="monotone" dataKey="individual" stroke="#f59e0b" name="Individual" />
                    <Line type="monotone" dataKey="total" stroke="#8b5cf6" name="Total" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cars" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Car Performance</CardTitle>
              <CardDescription>P&L breakdown by car</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {carLevelPL.map((car, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{car.car}</h3>
                      <p className="text-sm text-gray-600">Monthly Due: ${car.due.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Earnings: ${car.earnings.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Expenses: ${car.expenses.toLocaleString()}</p>
                      <p className={`font-bold ${car.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Net: ${car.net.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Driver Performance</CardTitle>
              <CardDescription>P&L breakdown by driver</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {driverLevelPL.map((driver, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{driver.driver}</h3>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Earnings: ${driver.earnings.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Expenses: ${driver.expenses.toLocaleString()}</p>
                      <p className={`font-bold ${driver.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Net: ${driver.net.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Expenses by type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expensesByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="amount" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
