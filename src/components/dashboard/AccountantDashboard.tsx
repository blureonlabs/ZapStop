'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, Receipt, TrendingUp, Download } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardSkeleton } from '@/components/ui/loading-skeleton'
import { dashboardAPI, exportAPI } from '@/lib/edge-functions'

interface AccountantDashboardData {
  companyStats: {
    totalEarnings: number
    totalExpenses: number
    netProfit: number
    pendingExpenses: number
  }
  recentExpenses: Array<{
    id: string
    driver: string
    amount: number
    type: string
    status: string
    date: string
  }>
  earningsByDate: Array<{
    date: string
    total: number
  }>
  expensesByType: Array<{
    type: string
    amount: number
    count: number
  }>
}

export default function AccountantDashboard() {
  const [dashboardData, setDashboardData] = useState<AccountantDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const data = await dashboardAPI.getStats(timeFilter)
        setDashboardData(data)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeFilter])

  const handleExport = async (type: 'earnings' | 'expenses' | 'all', format: 'csv' | 'json' = 'json') => {
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
      }

      if (format === 'csv' && result.data) {
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
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  const { companyStats, recentExpenses, earningsByDate, expensesByType } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accountant Dashboard</h1>
          <p className="text-gray-600">Financial overview and expense management</p>
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
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${companyStats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              This {timeFilter}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${companyStats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {companyStats.pendingExpenses} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${companyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${companyStats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">Recent Expenses</TabsTrigger>
          <TabsTrigger value="earnings">Earnings Trend</TabsTrigger>
          <TabsTrigger value="breakdown">Expense Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Latest expense submissions requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExpenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{expense.driver}</h3>
                      <p className="text-sm text-gray-600">{expense.type} • {expense.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${expense.amount.toLocaleString()}</p>
                      <p className={`text-sm ${expense.status === 'pending' ? 'text-yellow-600' : expense.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                        {expense.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Trend</CardTitle>
              <CardDescription>Daily earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {earningsByDate.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{item.date}</h3>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
              <CardDescription>Expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expensesByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{item.type}</h3>
                      <p className="text-sm text-gray-600">{item.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
