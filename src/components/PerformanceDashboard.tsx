'use client'

import { useState, useEffect, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PerformanceMonitor } from '@/lib/performance'
import { dataCache } from '@/lib/dataCache'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Activity, Clock, Database, Zap, RefreshCw } from 'lucide-react'

const PerformanceDashboard = memo(function PerformanceDashboard() {
  const [report, setReport] = useState(PerformanceMonitor.getPerformanceReport())
  const [cacheStats, setCacheStats] = useState(dataCache.getStats())
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshData = () => {
    setReport(PerformanceMonitor.getPerformanceReport())
    setCacheStats(dataCache.getStats())
    setRefreshKey(prev => prev + 1)
  }

  useEffect(() => {
    const interval = setInterval(refreshData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const performanceData = report.byType
  const chartData = Object.entries(performanceData).map(([type, data]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    count: data.count,
    averageTime: Math.round(data.averageTime)
  }))

  const slowOperationsData = report.slowOperations.slice(-10).map(op => ({
    operation: op.label,
    duration: Math.round(op.duration),
    type: op.type
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-gray-600">Monitor application performance and cache statistics</p>
        </div>
        <Button onClick={refreshData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalOperations}</div>
            <p className="text-xs text-muted-foreground">
              Average: {Math.round(report.averageTime)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Operations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{report.slowOperations.length}</div>
            <p className="text-xs text-muted-foreground">
              > 1000ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Entries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Max: {cacheStats.maxSize}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cacheStats.hitRate}%</div>
            <p className="text-xs text-muted-foreground">
              Performance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operations by Type</CardTitle>
            <CardDescription>Performance metrics by operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Response Times</CardTitle>
            <CardDescription>Average time per operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="averageTime" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Slow Operations</CardTitle>
          <CardDescription>Operations that took longer than 1000ms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {slowOperationsData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No slow operations detected</p>
            ) : (
              slowOperationsData.map((op, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{op.operation}</p>
                    <p className="text-sm text-gray-600">{op.type}</p>
                  </div>
                  <Badge variant="destructive">{op.duration}ms</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cache Statistics</CardTitle>
          <CardDescription>Current cache state and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{cacheStats.entriesByPriority.high}</div>
              <p className="text-sm text-gray-600">High Priority</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{cacheStats.entriesByPriority.medium}</div>
              <p className="text-sm text-gray-600">Medium Priority</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{cacheStats.entriesByPriority.low}</div>
              <p className="text-sm text-gray-600">Low Priority</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{cacheStats.expiredEntries}</div>
              <p className="text-sm text-gray-600">Expired</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default PerformanceDashboard
