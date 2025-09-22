'use client'

import { memo, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface EarningsByPlatform {
  name: string
  value: number
  color: string
}

interface EarningsByDate {
  date: string
  uber: number
  bolt: number
  individual: number
  total: number
}

interface ExpensesByType {
  type: string
  amount: number
  count: number
}

interface DashboardChartsProps {
  earningsByPlatform: EarningsByPlatform[]
  earningsByDate: EarningsByDate[]
  expensesByType: ExpensesByType[]
}

// Lazy load chart components
const PieChartComponent = memo(function PieChartComponent({ data }: { data: EarningsByPlatform[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
      </PieChart>
    </ResponsiveContainer>
  )
})

const LineChartComponent = memo(function LineChartComponent({ data }: { data: EarningsByDate[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
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
  )
})

const BarChartComponent = memo(function BarChartComponent({ data }: { data: ExpensesByType[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="type" />
        <YAxis />
        <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
        <Bar dataKey="amount" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  )
})

const ChartSkeleton = () => (
  <div className="h-[300px] flex items-center justify-center">
    <div className="animate-pulse bg-gray-200 rounded w-full h-full"></div>
  </div>
)

const DashboardCharts = memo(function DashboardCharts({ 
  earningsByPlatform, 
  earningsByDate, 
  expensesByType 
}: DashboardChartsProps) {
  return (
    <Tabs defaultValue="earnings" className="space-y-4">
      <TabsList>
        <TabsTrigger value="earnings">Earnings Analysis</TabsTrigger>
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
              <Suspense fallback={<ChartSkeleton />}>
                <PieChartComponent data={earningsByPlatform} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Earnings Over Time</CardTitle>
              <CardDescription>Daily earnings trend</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ChartSkeleton />}>
                <LineChartComponent data={earningsByDate} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="expenses" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Expenses by type</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartSkeleton />}>
              <BarChartComponent data={expensesByType} />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
})

export default DashboardCharts
