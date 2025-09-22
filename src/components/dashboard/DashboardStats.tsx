'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt } from 'lucide-react'

interface CompanyStats {
  totalCars: number
  totalOwners: number
  totalActiveDrivers: number
  totalMandatoryDues: number
  totalEarnings: number
  totalExpenses: number
  netProfit: number
}

interface DashboardStatsProps {
  companyStats: CompanyStats
}

const DashboardStats = memo(function DashboardStats({ companyStats }: DashboardStatsProps) {
  return (
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
  )
})

export default DashboardStats
