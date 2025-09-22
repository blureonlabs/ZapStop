'use client'

import { useState, useEffect, useCallback, lazy, Suspense, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardSkeleton } from '@/components/ui/loading-skeleton'
import { dashboardAPI, exportAPI } from '@/lib/edge-functions'
import { dataCache, cacheKeys, cacheTags } from '@/lib/dataCache'
import { useDashboardProgressiveData } from '@/hooks/useProgressiveData'

// Lazy load dashboard components
const DashboardStats = lazy(() => import('./DashboardStats'))
const DashboardCharts = lazy(() => import('./DashboardCharts'))
const DashboardTables = lazy(() => import('./DashboardTables'))

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
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly')
  const [refreshing, setRefreshing] = useState(false)

  // Use progressive loading for dashboard data
  const {
    criticalData: dashboardData,
    secondaryData: chartsData,
    criticalLoading,
    secondaryLoading,
    criticalError,
    secondaryError,
    refetchCritical,
    refetchSecondary,
    refetchAll
  } = useDashboardProgressiveData(timeFilter)

  const fetchDashboardData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true)
        refetchAll()
        toast.success('Dashboard data refreshed successfully!')
      }
    } catch (error) {
      console.error('Error refreshing dashboard data:', error)
      toast.error('Failed to refresh dashboard data')
    } finally {
      setRefreshing(false)
    }
  }, [refetchAll])

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

  if (criticalLoading) {
    return <DashboardSkeleton />
  }

  if (criticalError || !dashboardData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Failed to Load Dashboard</h2>
        <p className="text-gray-600 mb-4">
          {criticalError || 'Unable to load dashboard data. Please try again.'}
        </p>
        <Button onClick={() => refetchCritical()}>Retry</Button>
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

      {/* Stats Cards - Load immediately */}
      <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        ))}
      </div>}>
        <DashboardStats companyStats={companyStats} />
      </Suspense>

      {/* Charts - Progressive load */}
      {secondaryLoading ? (
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading charts...</div>
        </div>
      ) : secondaryError ? (
        <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
          <div className="text-red-500">Failed to load charts: {secondaryError}</div>
        </div>
      ) : (
        <Suspense fallback={<div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>}>
          <DashboardCharts 
            earningsByPlatform={earningsByPlatform}
            earningsByDate={earningsByDate}
            expensesByType={expensesByType}
          />
        </Suspense>
      )}

      {/* Tables - Progressive load */}
      {secondaryLoading ? (
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-500">Loading performance data...</div>
        </div>
      ) : secondaryError ? (
        <div className="h-96 bg-red-50 rounded-lg flex items-center justify-center">
          <div className="text-red-500">Failed to load performance data: {secondaryError}</div>
        </div>
      ) : (
        <Suspense fallback={<div className="h-96 bg-gray-200 rounded-lg animate-pulse"></div>}>
          <DashboardTables 
            carLevelPL={carLevelPL}
            driverLevelPL={driverLevelPL}
          />
        </Suspense>
      )}
    </div>
  )
}
