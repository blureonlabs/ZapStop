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

interface OwnerCar {
  id: string
  plate_number: string
  model: string
  monthly_due: number
  assigned_driver_id?: string
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

interface DriverContribution {
  driverId: string
  driverName: string
  earnings: number
  expenses: number
  workHours: number
  daysWorked: number
}

interface CarPerformance {
  carId: string
  plateNumber: string
  model: string
  totalEarnings: number
  totalExpenses: number
  totalNetProfit: number
  totalWorkHours: number
  currentDriverName?: string
  isActive: boolean
  driverContributions: DriverContribution[]
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
            assigned_driver_id
          )
        `)
        .eq('owner_id', ownerData.id)

      if (carsError) {
        console.error('Error fetching cars:', carsError)
        toast.error('Failed to fetch cars data')
        return
      }

      const ownerCars = carsData?.map(oc => oc.cars).filter(Boolean).flat() as OwnerCar[] || []
      console.log('Raw cars data:', carsData)
      console.log('Owner cars data:', ownerCars)

      // Get driver information for each car
      const enrichedCars = await Promise.all(
        ownerCars.map(async (car) => {
          if (car.assigned_driver_id) {
            const { data: driverData } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('id', car.assigned_driver_id)
              .single()
            
            return {
              ...car,
              assigned_driver: driverData || undefined
            }
          }
          return car
        })
      )

      console.log('Enriched cars data:', enrichedCars)
      setCars(enrichedCars)

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

        // Fetch earnings-car mappings for accurate attribution
        const { data: earningsMappings } = await supabase
          .from('earnings_car_mapping')
          .select(`
            id,
            earning_id,
            car_id,
            date,
            driver_earnings!earnings_car_mapping_earning_id_fkey (
              id,
              driver_id,
              uber_cash,
              uber_account,
              bolt_cash,
              bolt_account,
              individual_rides_cash,
              individual_rides_account
            )
          `)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', now.toISOString().split('T')[0])

        // Get all unique driver IDs from earnings mappings AND current assigned drivers
        const allDriverIds = new Set<string>()
        
        // Add drivers from earnings mappings
        earningsMappings?.forEach(mapping => {
          if (mapping.driver_earnings && 'driver_id' in mapping.driver_earnings) {
            allDriverIds.add(mapping.driver_earnings.driver_id as string)
          }
        })
        
        // Add current assigned drivers from cars
        ownerCars.forEach(car => {
          if (car.assigned_driver_id) {
            allDriverIds.add(car.assigned_driver_id)
          }
        })

        // Fetch driver names for all drivers
        const driverNames = await Promise.all(
          Array.from(allDriverIds).map(async (driverId) => {
            const { data: driverData } = await supabase
              .from('users')
              .select('id, name, email')
              .eq('id', driverId)
              .single()
            return { driverId, driverData }
          })
        )

        // Create a map for quick lookup
        const driverNamesMap = new Map<string, { name: string; email: string }>()
        driverNames.forEach(({ driverId, driverData }) => {
          if (driverData) {
            driverNamesMap.set(driverId, { name: driverData.name, email: driverData.email })
          }
        })

        // Calculate car performance with driver attribution using earnings-car mapping
        const carPerformanceData: CarPerformance[] = ownerCars.map(car => {
          // Get earnings mappings for this specific car
          const carEarningsMappings = earningsMappings?.filter(mapping => mapping.car_id === car.id) || []
          
          // Get all drivers who have earnings for this car
          const carDriverIds = new Set<string>()
          
          // Add current driver if assigned
          if (car.assigned_driver_id) {
            carDriverIds.add(car.assigned_driver_id)
          }
          
          // Add drivers from earnings mappings
          carEarningsMappings.forEach(mapping => {
            if (mapping.driver_earnings && 'driver_id' in mapping.driver_earnings) {
              carDriverIds.add(mapping.driver_earnings.driver_id as string)
            }
          })
          
          // Also add drivers from expenses and attendance for this car
          expenses.forEach(expense => {
            if (expense.driver_id) carDriverIds.add(expense.driver_id)
          })
          attendance.forEach(att => {
            if (att.driver_id) carDriverIds.add(att.driver_id)
          })
          
          // Calculate contributions for each driver using earnings-car mapping
          const driverContributions: DriverContribution[] = Array.from(carDriverIds).map(driverId => {
            // Get earnings for this driver from the car's earnings mappings
            const driverEarnings = carEarningsMappings
              .filter(mapping => mapping.driver_earnings && 'driver_id' in mapping.driver_earnings && mapping.driver_earnings.driver_id === driverId)
              .reduce((sum, mapping) => {
                const earning = mapping.driver_earnings as any
                if (earning) {
                  return sum + (earning.uber_cash || 0) + (earning.uber_account || 0) + 
                         (earning.bolt_cash || 0) + (earning.bolt_account || 0) + 
                         (earning.individual_rides_cash || 0) + (earning.individual_rides_account || 0)
                }
                return sum
              }, 0)

            const driverExpenses = expenses
              .filter(e => e.driver_id === driverId)
              .reduce((sum, e) => sum + e.amount, 0)

            const driverWorkHours = attendance
              .filter(a => a.driver_id === driverId)
              .reduce((sum, att) => {
                if (att.start_time && att.end_time) {
                  const start = new Date(`2000-01-01T${att.start_time}`)
                  const end = new Date(`2000-01-01T${att.end_time}`)
                  return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                }
                return sum
              }, 0)

            const daysWorked = attendance
              .filter(a => a.driver_id === driverId && a.start_time && a.end_time)
              .length

            // Get driver name from the driver names map
            const driverInfo = driverNamesMap.get(driverId)
            const driverName = driverInfo?.name || 'Unknown Driver'

            return {
              driverId,
              driverName,
              earnings: driverEarnings,
              expenses: driverExpenses,
              workHours: driverWorkHours,
              daysWorked
            }
          })

          // Calculate totals
          const totalEarnings = driverContributions.reduce((sum, d) => sum + d.earnings, 0)
          const totalExpenses = driverContributions.reduce((sum, d) => sum + d.expenses, 0)
          const totalWorkHours = driverContributions.reduce((sum, d) => sum + d.workHours, 0)
          const isActive = activeAttendance.some(a => a.driver_id === car.assigned_driver_id)

          return {
            carId: car.id,
            plateNumber: car.plate_number,
            model: car.model,
            totalEarnings,
            totalExpenses,
            totalNetProfit: totalEarnings - totalExpenses,
            totalWorkHours,
            currentDriverName: car.assigned_driver_id ? 
              (driverNamesMap.get(car.assigned_driver_id)?.name || 'Unknown Driver') : 
              'Unassigned',
            isActive,
            driverContributions
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

        // Filter to only show today's active drivers
        const todayActiveDrivers = activeAttendance.filter(att => att.date === now.toISOString().split('T')[0])
        
        // Update state
        console.log('All active attendance data:', activeAttendance)
        console.log('Today active drivers:', todayActiveDrivers)
        console.log('Today date:', now.toISOString().split('T')[0])
        console.log('Driver IDs:', driverIds)
        setActiveDrivers(todayActiveDrivers)
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
                            <div>
                              <p className="text-xs text-gray-500">Driver ID: {car.assigned_driver_id || 'None'}</p>
                              <Badge variant="secondary">Unassigned</Badge>
                            </div>
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
                      
                      // Calculate work duration more accurately
                      const now = new Date()
                      const today = now.toISOString().split('T')[0]
                      
                      // Parse start time components
                      const [hours, minutes, seconds] = (attendance.start_time || '00:00:00').split(':').map(Number)
                      
                      // Create start time for today using local timezone
                      const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds)
                      
                      console.log(`Debug - Driver ${attendance.driver_id}:`)
                      console.log(`  - Attendance date: ${attendance.date}`)
                      console.log(`  - Start time: ${attendance.start_time}`)
                      console.log(`  - Today: ${today}`)
                      console.log(`  - Start datetime (local): ${startTime.toISOString()}`)
                      console.log(`  - Current datetime: ${now.toISOString()}`)
                      
                      const timeDiffMs = now.getTime() - startTime.getTime()
                      const totalMinutes = Math.max(0, Math.floor(timeDiffMs / (1000 * 60)))
                      const workHours = Math.floor(totalMinutes / 60)
                      const workMinutes = totalMinutes % 60
                      const workDurationFormatted = `${workHours.toString().padStart(2, '0')}:${workMinutes.toString().padStart(2, '0')}`
                      
                      console.log(`  - Time diff (ms): ${timeDiffMs}`)
                      console.log(`  - Work duration: ${workDurationFormatted}`)

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
                                {workDurationFormatted}
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
                                Current Driver: {car.currentDriverName || 'Unassigned'}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-center p-3 bg-green-50 rounded">
                            <div className="text-lg font-bold text-green-600">${car.totalEarnings.toLocaleString()}</div>
                            <div className="text-xs text-green-700">Total Earnings</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 rounded">
                            <div className="text-lg font-bold text-red-600">${car.totalExpenses.toLocaleString()}</div>
                            <div className="text-xs text-red-700">Total Expenses</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <div className={`text-lg font-bold ${car.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${car.totalNetProfit.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-700">Net Profit</div>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded">
                            <div className="text-lg font-bold text-purple-600">{car.totalWorkHours.toFixed(1)}h</div>
                            <div className="text-xs text-purple-700">Total Hours</div>
                          </div>
                        </div>

                        {/* Driver Attribution */}
                        {car.driverContributions.length > 0 && (
                          <div className="border-t pt-3">
                            <div className="text-xs font-medium text-gray-600 mb-2">Driver Contributions:</div>
                            <div className="space-y-2">
                              {car.driverContributions.map((driver, index) => (
                                <div key={driver.driverId} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 font-semibold text-xs">
                                        {driver.driverName.charAt(0)}
                                      </span>
                                    </div>
                                    <span className="font-medium">{driver.driverName}</span>
                                    {driver.driverId === car.currentDriverName && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">Current</Badge>
                                    )}
                                  </div>
                                  <div className="flex space-x-4 text-gray-600">
                                    <span>${driver.earnings.toFixed(0)}</span>
                                    <span>{driver.workHours.toFixed(1)}h</span>
                                    <span>{driver.daysWorked}d</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
