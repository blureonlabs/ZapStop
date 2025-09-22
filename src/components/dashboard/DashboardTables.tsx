'use client'

import { memo, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface CarLevelPL {
  car: string
  earnings: number
  expenses: number
  net: number
  due: number
}

interface DriverLevelPL {
  driver: string
  earnings: number
  expenses: number
  net: number
}

interface DashboardTablesProps {
  carLevelPL: CarLevelPL[]
  driverLevelPL: DriverLevelPL[]
}

const CarPerformanceTable = memo(function CarPerformanceTable({ data }: { data: CarLevelPL[] }) {
  return (
    <div className="space-y-4">
      {data.map((car, index) => (
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
  )
})

const DriverPerformanceTable = memo(function DriverPerformanceTable({ data }: { data: DriverLevelPL[] }) {
  return (
    <div className="space-y-4">
      {data.map((driver, index) => (
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
  )
})

const TableSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="text-right space-y-2">
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
)

const DashboardTables = memo(function DashboardTables({ carLevelPL, driverLevelPL }: DashboardTablesProps) {
  return (
    <Tabs defaultValue="cars" className="space-y-4">
      <TabsList>
        <TabsTrigger value="cars">Car Performance</TabsTrigger>
        <TabsTrigger value="drivers">Driver Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="cars" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Car Performance</CardTitle>
            <CardDescription>P&L breakdown by car</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<TableSkeleton />}>
              <CarPerformanceTable data={carLevelPL} />
            </Suspense>
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
            <Suspense fallback={<TableSkeleton />}>
              <DriverPerformanceTable data={driverLevelPL} />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
})

export default DashboardTables
