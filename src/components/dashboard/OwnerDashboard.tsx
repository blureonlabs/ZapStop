'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Owner, Car, DriverEarning, DriverExpense, Attendance } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt, Building2, Users, Clock, MapPin, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface OwnerCar extends Car {
  assigned_driver?: {
    id: string
    name: string
    email: string
  }
  earnings?: DriverEarning[]
  expenses?: DriverExpense[]
  isActive?: boolean
  workDuration?: number
}

interface OwnerStats {
  totalCars: number
  totalEarnings: number
  totalExpenses: number
  netProfit: number
  activeDrivers: number
  assignedCars: number
  unassignedCars: number
  totalWorkHours: number
  averageEarningsPerCar: number
  averageEarningsPerDriver: number
}

interface FinancialData {
  date: string
  earnings: number
  expenses: number
  net: number
}

interface CarPerformance {
  carId: string
  plateNumber: string
  model: string
  earnings: number
  expenses: number
  netProfit: number
  workHours: number
  driverName?: string
  isActive: boolean
}

export default function OwnerDashboard() {
  const { appUser } = useAuth()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [cars, setCars] = useState<OwnerCar[]>([])
  const [activeDrivers, setActiveDrivers] = useState<Attendance[]>([])
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [carPerformance, setCarPerformance] = useState<CarPerformance[]>([])
  const [stats, setStats] = useState<OwnerStats>({
    totalCars: 0,
    totalEarnings: 0,
    totalExpenses: 0,
    netProfit: 0,
    activeDrivers: 0,
    assignedCars: 0,
    unassignedCars: 0,
    totalWorkHours: 0,
    averageEarningsPerCar: 0,
    averageEarningsPerDriver: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly'>('monthly')

  const fetchOwnerData = useCallback(async () => {
    if (!appUser || appUser.role !== 'owner') return

    try {
      if (!refreshing) setLoading(true)
      
      // Get owner details
      const { data: ownerData, error: ownerError } = await supabase
        .from('owners')
        .select('*')
        .eq('email', appUser.email)
        .single()

      if (ownerError) {
        console.error('Error fetching owner:', ownerError)
        toast.error('Failed to fetch owner data')
        return
      }

      setOwner(ownerData)

      // Get owner's cars with driver assignments
      const { data: carsData, error: carsError } = await supabase
        .from('owner_cars')
        .select(`
          car_id,
          cars (
            id,
            plate_number,
            model,
            monthly_due,
            assigned_driver_id,
            users!cars_assigned_driver_id_fkey (
              id,
              name,
              email
            )
          )
        `)
        .eq('owner_id', ownerData.id)

      if (carsError) {
        console.error('Error fetching cars:', carsError)
        toast.error('Failed to fetch cars data')
        return
      }

      const ownerCars = carsData?.map(oc => oc.cars).filter(Boolean) as OwnerCar[] || []
      setCars(ownerCars)

      // Calculate date range
      const now = new Date()
      const startDate = new Date()
      
      switch (timeFilter) {
        case 'daily':
          startDate.setDate(now.getDate() - 1)
          break
        case 'weekly':
          startDate.setDate(now.getDate() - 7)
          break
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1)
          break
        case '3months':
          startDate.setMonth(now.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(now.getMonth() - 6)
          break
        case 'yearly':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Get driver IDs for owner's cars
      const driverIds = ownerCars
        .map(car => car.assigned_driver_id)
        .filter(Boolean) as string[]

      if (driverIds.length > 0) {
        // Fetch all data in parallel
        const [earningsData, expensesData, attendanceData, activeAttendanceData] = await Promise.all([
          supabase
            .from('driver_earnings')
            .select('*')
            .in('driver_id', driverIds)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', now.toISOString().split('T')[0]),
          supabase
            .from('driver_expenses')
            .select('*')
            .in('driver_id', driverIds)
            .eq('status', 'approved')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', now.toISOString().split('T')[0]),
          supabase
            .from('attendance')
            .select('*')
            .in('driver_id', driverIds)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', now.toISOString().split('T')[0]),
          supabase
            .from('attendance')
            .select('*')
            .in('driver_id', driverIds)
            .eq('date', now.toISOString().split('T')[0])
            .eq('status', 'present')
            .is('end_time', null)
        ])

        const earnings = earningsData.data || []
        const expenses = expensesData.data || []
        const attendance = attendanceData.data || []
        const activeAttendance = activeAttendanceData.data || []

        // Calculate financial data
        const totalEarnings = earnings.reduce((sum, earning) => 
          sum + earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account, 0)

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
        const netProfit = totalEarnings - totalExpenses

        // Calculate work hours
        const totalWorkHours = attendance.reduce((sum, att) => {
          if (att.start_time && att.end_time) {
            const start = new Date(`2000-01-01T${att.start_time}`)
            const end = new Date(`2000-01-01T${att.end_time}`)
            return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          }
          return sum
        }, 0)

        // Calculate car performance
        const carPerformanceData: CarPerformance[] = ownerCars.map(car => {
          const carEarnings = earnings
            .filter(e => e.driver_id === car.assigned_driver_id)
            .reduce((sum, e) => sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_rides_cash + e.individual_rides_account, 0)

          const carExpenses = expenses
            .filter(e => e.driver_id === car.assigned_driver_id)
            .reduce((sum, e) => sum + e.amount, 0)

          const carWorkHours = attendance
            .filter(a => a.driver_id === car.assigned_driver_id)
            .reduce((sum, att) => {
              if (att.start_time && att.end_time) {
                const start = new Date(`2000-01-01T${att.start_time}`)
                const end = new Date(`2000-01-01T${att.end_time}`)
                return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
              }
              return sum
            }, 0)

          const isActive = activeAttendance.some(a => a.driver_id === car.assigned_driver_id)

          return {
            carId: car.id,
            plateNumber: car.plate_number,
            model: car.model,
            earnings: carEarnings,
            expenses: carExpenses,
            netProfit: carEarnings - carExpenses,
            workHours: carWorkHours,
            driverName: car.assigned_driver?.name,
            isActive
          }
        })

        // Generate financial data for charts
        const financialDataByDate: { [key: string]: { earnings: number, expenses: number } } = {}
        
        earnings.forEach(earning => {
          const date = earning.date
          if (!financialDataByDate[date]) {
            financialDataByDate[date] = { earnings: 0, expenses: 0 }
          }
          financialDataByDate[date].earnings += earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_rides_cash + earning.individual_rides_account
        })

        expenses.forEach(expense => {
          const date = expense.date
          if (!financialDataByDate[date]) {
            financialDataByDate[date] = { earnings: 0, expenses: 0 }
          }
          financialDataByDate[date].expenses += expense.amount
        })

        const financialChartData = Object.entries(financialDataByDate)
          .map(([date, data]) => ({
            date,
            earnings: data.earnings,
            expenses: data.expenses,
            net: data.earnings - data.expenses
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        // Update state
        setActiveDrivers(activeAttendance)
        setFinancialData(financialChartData)
        setCarPerformance(carPerformanceData)

        const assignedCars = ownerCars.filter(car => car.assigned_driver_id).length
        const unassignedCars = ownerCars.length - assignedCars

        setStats({
          totalCars: ownerCars.length,
          totalEarnings,
          totalExpenses,
          netProfit,
          activeDrivers: activeAttendance.length,
          assignedCars,
          unassignedCars,
          totalWorkHours: Math.round(totalWorkHours * 10) / 10,
          averageEarningsPerCar: ownerCars.length > 0 ? Math.round(totalEarnings / ownerCars.length) : 0,
          averageEarningsPerDriver: driverIds.length > 0 ? Math.round(totalEarnings / driverIds.length) : 0
        })
      } else {
        // No drivers assigned
        setStats({
          totalCars: ownerCars.length,
          totalEarnings: 0,
          totalExpenses: 0,
          netProfit: 0,
          activeDrivers: 0,
          assignedCars: 0,
          unassignedCars: ownerCars.length,
          totalWorkHours: 0,
          averageEarningsPerCar: 0,
          averageEarningsPerDriver: 0
        })
      }

    } catch (error) {
      console.error('Error fetching owner data:', error)
      toast.error('Failed to load owner dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [appUser, timeFilter, refreshing])

  useEffect(() => {
    fetchOwnerData()
  }, [fetchOwnerData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true)
      fetchOwnerData()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchOwnerData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchOwnerData()
  }, [fetchOwnerData])

  const handleTimeFilterChange = (value: 'daily' | 'weekly' | 'monthly' | '3months' | '6months' | 'yearly') => {
    setTimeFilter(value)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-gray-600 mt-1">Loading your fleet data...</p>
          </div>
        </div>
        <div className="grid gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!owner) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Owner Not Found</h2>
        <p className="text-gray-600 mb-4">Unable to find owner data for your account.</p>
        <Button onClick={fetchOwnerData}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {owner.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select value={timeFilter} onValueChange={handleTimeFilterChange}>
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

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Size</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCars}</div>
            <p className="text-xs text-muted-foreground">
              {stats.assignedCars} assigned, {stats.unassignedCars} unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground">
              Currently on duty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.averageEarningsPerCar} avg per car
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWorkHours}h total work time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="fleet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fleet">Fleet Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
          <TabsTrigger value="drivers">Active Drivers</TabsTrigger>
          <TabsTrigger value="performance">Car Performance</TabsTrigger>
        </TabsList>

        {/* Fleet Overview Tab */}
        <TabsContent value="fleet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Status</CardTitle>
              <CardDescription>Your cars and their current assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cars.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No cars in your fleet yet</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {cars.map((car) => (
                      <div key={car.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CarIcon className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{car.plate_number}</h3>
                            <p className="text-sm text-gray-600">{car.model}</p>
                            <p className="text-xs text-gray-500">Monthly Due: ${car.monthly_due}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {car.assigned_driver ? (
                            <div>
                              <p className="text-sm font-medium">{car.assigned_driver.name}</p>
                              <p className="text-xs text-gray-600">{car.assigned_driver.email}</p>
                              <Badge className="mt-1 bg-green-100 text-green-800">Assigned</Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary">Unassigned</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Analysis Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Earnings vs Expenses breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">${stats.totalEarnings.toLocaleString()}</div>
                      <div className="text-sm text-green-700">Total Earnings</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">${stats.totalExpenses.toLocaleString()}</div>
                      <div className="text-sm text-red-700">Total Expenses</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${stats.netProfit.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-700">Net Profit</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Trends</CardTitle>
                <CardDescription>Earnings and expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                {financialData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={financialData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} />
                      <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No financial data available for the selected period</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Active Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Drivers</CardTitle>
              <CardDescription>Drivers currently on duty</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeDrivers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No drivers currently on duty</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {activeDrivers.map((attendance) => {
                      const car = cars.find(c => c.assigned_driver_id === attendance.driver_id)
                      const startTime = new Date(`${attendance.date}T${attendance.start_time}`)
                      const now = new Date()
                      const workDuration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10

                      return (
                        <div key={attendance.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Driver ID: {attendance.driver_id}</h3>
                              <p className="text-sm text-gray-600">
                                Car: {car?.plate_number || 'No car assigned'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Started: {attendance.start_time}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-green-600 mb-1">
                              <Clock className="h-4 w-4 mr-1" />
                              <span className="font-semibold">
                                {workDuration > 0 ? `${workDuration}h` : 'Just started'}
                              </span>
                            </div>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Car Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Car Performance</CardTitle>
              <CardDescription>Performance metrics for each car</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {carPerformance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No performance data available</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {carPerformance.map((car) => (
                      <div key={car.carId} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <CarIcon className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{car.plateNumber}</h3>
                              <p className="text-sm text-gray-600">{car.model}</p>
                              <p className="text-xs text-gray-500">
                                Driver: {car.driverName || 'Unassigned'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {car.isActive ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">${car.earnings.toLocaleString()}</div>
                            <div className="text-xs text-green-700">Earnings</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded">
                            <div className="text-lg font-bold text-red-600">${car.expenses.toLocaleString()}</div>
                            <div className="text-xs text-red-700">Expenses</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className={`text-lg font-bold ${car.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${car.netProfit.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-700">Net Profit</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded">
                            <div className="text-lg font-bold text-purple-600">{car.workHours.toFixed(1)}h</div>
                            <div className="text-xs text-purple-700">Work Hours</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
