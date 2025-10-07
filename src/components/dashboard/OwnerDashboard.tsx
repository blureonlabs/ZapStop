'use client'

import { useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, Owner, Car, DriverEarning, DriverExpense, Attendance } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt, Building2, Users, Clock, MapPin, RefreshCw, AlertCircle, CheckCircle, XCircle, Calendar as CalendarIcon } from 'lucide-react'
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
  totalDue: number
  monthlyProfit: number
  ownerNetEarnings: number
  totalDriverCommission: number
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
  monthlyDue: number
  monthlyProfit: number
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
    averageEarningsPerDriver: 0,
    totalDue: 0,
    monthlyProfit: 0,
    ownerNetEarnings: 0,
    totalDriverCommission: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [preset, setPreset] = useState<'today' | 'yesterday' | 'current_week' | 'current_month' | 'last_month' | 'custom'>('current_month')
  const [timeFilter, setTimeFilter] = useState<'custom' | 'preset'>('preset')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return { start: startStr, end: endStr }
  })
  const [selectedTab, setSelectedTab] = useState<'fleet' | 'financial' | 'drivers' | 'performance' | 'daily-profit'>('fleet')

  // Load saved tab on mount and persist on change
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('ownerSelectedTab') : null
      if (saved === 'fleet' || saved === 'financial' || saved === 'drivers' || saved === 'performance' || saved === 'daily-profit') {
        setSelectedTab(saved as any)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ownerSelectedTab', selectedTab)
      }
    } catch {}
  }, [selectedTab])

  const formatDate = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const formatDisplayDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
  }

  const applyPreset = (p: typeof preset) => {
    const now = new Date()
    let start = new Date(now)
    let end = new Date(now)

    switch (p) {
      case 'today':
        // start and end are today
        break
      case 'yesterday':
        start.setDate(now.getDate() - 1)
        end.setDate(now.getDate() - 1)
        break
      case 'current_week': {
        // Start on Monday, end on Sunday in local time
        const day = (now.getDay() + 6) % 7 // 0->Mon, 6->Sun
        start.setDate(now.getDate() - day)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        break
      }
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'custom':
        return // do not change range here
    }

    setDateRange({ start: formatDate(start), end: formatDate(end) })
  }

  // Safely compute total earnings for a single earning record, tolerating missing columns
  const getEarningTotal = useCallback((earning: Partial<DriverEarning> & Record<string, any>) => {
    const uberCash = Number(earning.uber_cash) || 0
    const uberAccount = Number(earning.uber_account) || 0
    const boltCash = Number(earning.bolt_cash) || 0
    const boltAccount = Number(earning.bolt_account) || 0

    // Fallback to individual_cash if newer individual_rides_* fields are absent
    const individualCash = Number(earning.individual_rides_cash ?? earning.individual_cash) || 0
    const individualAccount = Number(earning.individual_rides_account ?? 0) || 0

    return uberCash + uberAccount + boltCash + boltAccount + individualCash + individualAccount
  }, [])

  const fetchOwnerData = useCallback(async (silent = false) => {
    if (!appUser || appUser.role !== 'owner') return

    try {
      if (!refreshing && !silent) setLoading(true)
      
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

      // Use date range from state
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)

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
            .lte('date', endDate.toISOString().split('T')[0]),
          supabase
            .from('driver_expenses')
            .select('*')
            .in('driver_id', driverIds)
            .eq('status', 'approved')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]),
          supabase
            .from('attendance')
            .select('*')
            .in('driver_id', driverIds)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]),
          supabase
            .from('attendance')
            .select('*')
            .in('driver_id', driverIds)
            .eq('date', new Date().toISOString().split('T')[0])
            .eq('status', 'present')
            .is('end_time', null)
        ])

        const earnings = earningsData.data || []
        const expenses = expensesData.data || []
        const attendance = attendanceData.data || []
        const activeAttendance = activeAttendanceData.data || []

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
          .lte('date', endDate.toISOString().split('T')[0])

        // Fetch expenses-car mappings for accurate attribution
        const { data: expensesMappings } = await supabase
          .from('expenses_car_mapping')
          .select(`
            id,
            expense_id,
            car_id,
            date,
            driver_expenses!expenses_car_mapping_expense_id_fkey (
              id,
              driver_id,
              amount,
              status
            )
          `)
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])

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

        // Calculate car performance with driver attribution using earnings/expenses car mappings
        const carPerformanceData: CarPerformance[] = ownerCars.map(car => {
          // Get earnings mappings for this specific car
          const carEarningsMappings = earningsMappings?.filter(mapping => mapping.car_id === car.id) || []
          // Get expenses mappings for this specific car
          const carExpensesMappings = expensesMappings?.filter(mapping => mapping.car_id === car.id) || []
          
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
          
          // Also add drivers from expenses mappings and attendance for this car
          carExpensesMappings.forEach(mapping => {
            if (mapping.driver_expenses && 'driver_id' in mapping.driver_expenses) {
              carDriverIds.add(mapping.driver_expenses.driver_id as string)
            }
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

            // Get expenses for this driver from the car's expenses mappings (approved only)
            const driverExpenses = carExpensesMappings
              .filter(mapping => mapping.driver_expenses && 'driver_id' in mapping.driver_expenses && mapping.driver_expenses.driver_id === driverId)
              .reduce((sum, mapping) => {
                const exp = mapping.driver_expenses as any
                if (exp && (exp.status === 'approved' || exp.status === 'approved' as any)) {
                  return sum + (Number(exp.amount) || 0)
                }
                return sum
              }, 0)

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
            monthlyDue: Number(car.monthly_due) || 0,
            monthlyProfit: (totalEarnings - totalExpenses) - (Number(car.monthly_due) || 0),
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
          financialDataByDate[date].earnings += getEarningTotal(earning)
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
        const todayActiveDrivers = activeAttendance.filter(att => att.date === new Date().toISOString().split('T')[0])
        
        // Update state
        console.log('All active attendance data:', activeAttendance)
        console.log('Today active drivers:', todayActiveDrivers)
        console.log('Today date:', new Date().toISOString().split('T')[0])
        console.log('Driver IDs:', driverIds)
        startTransition(() => {
          setActiveDrivers(todayActiveDrivers)
          setFinancialData(financialChartData)
          setCarPerformance(carPerformanceData)
        })

        // Calculate financial data using car performance data for consistency
        const totalEarnings = carPerformanceData.reduce((sum, car) => sum + car.totalEarnings, 0)
        const totalExpenses = carPerformanceData.reduce((sum, car) => sum + car.totalExpenses, 0)

        const assignedCars = ownerCars.filter(car => car.assigned_driver_id).length
        const unassignedCars = ownerCars.length - assignedCars
        
        // Calculate timeframe-specific dues (not monthly dues)
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        // Calculate daily due based on actual days in each month of the period
        let timeframeDue = 0
        let currentDate = new Date(startDate)

        while (currentDate <= endDate) {
          const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
          
          // Calculate days in this month that are within our range
          const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
          
          const rangeStart = currentDate > startDate ? currentDate : startDate
          const rangeEnd = endDate < monthEnd ? endDate : monthEnd
          const daysInRange = Math.max(0, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
          
          // Add due for this month's portion for all cars
          const monthlyDueForAllCars = ownerCars.reduce((sum, car) => sum + (Number(car.monthly_due) || 0), 0)
          const dailyDueForThisMonth = monthlyDueForAllCars / daysInCurrentMonth
          timeframeDue += dailyDueForThisMonth * daysInRange
          
          // Move to next month
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
        }
        
        const netProfit = totalEarnings - totalExpenses
        const monthlyProfit = totalEarnings - totalExpenses - timeframeDue

        // Calculate total driver commission and owner net earnings for the period
        const totalDriverCommission = netProfit * 0.30; // 30% of net profit before dues
        const ownerNetEarnings = netProfit - totalDriverCommission - timeframeDue; // Owner profit after commission and timeframe dues

        startTransition(() => {
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
            averageEarningsPerDriver: driverIds.length > 0 ? Math.round(totalEarnings / driverIds.length) : 0,
            totalDue: timeframeDue,
            monthlyProfit,
            ownerNetEarnings, // Added new stat
            totalDriverCommission // Added new stat
          })
        })
      } else {
        // No drivers assigned
        startTransition(() => {
          // Calculate timeframe-specific dues for no drivers case
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          
          let timeframeDue = 0
          let currentDate = new Date(startDate)

          while (currentDate <= endDate) {
            const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
            
            const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
            
            const rangeStart = currentDate > startDate ? currentDate : startDate
            const rangeEnd = endDate < monthEnd ? endDate : monthEnd
            const daysInRange = Math.max(0, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
            
            const monthlyDueForAllCars = ownerCars.reduce((sum, car) => sum + (Number(car.monthly_due) || 0), 0)
            const dailyDueForThisMonth = monthlyDueForAllCars / daysInCurrentMonth
            timeframeDue += dailyDueForThisMonth * daysInRange
            
            currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
          }
          
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
            averageEarningsPerDriver: 0,
            totalDue: timeframeDue,
            monthlyProfit: -timeframeDue,
            ownerNetEarnings: -timeframeDue, // Added new stat
            totalDriverCommission: 0 // Added new stat
          })
        })
      }

    } catch (error) {
      console.error('Error fetching owner data:', error)
      if (!silent) {
        toast.error('Failed to load owner dashboard data')
      }
    } finally {
      if (!silent) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [appUser, dateRange, refreshing])

  // Recompute date range when preset changes
  useEffect(() => {
    if (preset !== 'custom') {
      applyPreset(preset)
      setTimeFilter('preset')
    }
  }, [preset])

  useEffect(() => {
    fetchOwnerData()
  }, [fetchOwnerData])

  // Auto-refresh every 30 seconds (only when tab is visible) - silent refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        // Silent refresh - don't show refreshing state
        fetchOwnerData(true)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchOwnerData])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchOwnerData()
  }, [fetchOwnerData])

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-gray-600">Welcome back, {owner.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-3 items-center">
            <Select value={preset} onValueChange={(value: any) => setPreset(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="current_week">Current Week</SelectItem>
                <SelectItem value="current_month">Current Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {preset === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(r => ({ ...r, start: e.target.value }))}
                  className="border rounded px-2 py-1 text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(r => ({ ...r, end: e.target.value }))}
                  className="border rounded px-2 py-1 text-sm"
                />
              </div>
            )}
            <Button 
              onClick={() => handleRefresh()} 
              disabled={refreshing}
              variant="outline"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          <div className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 w-max whitespace-nowrap">
            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-gray-500" />
            <span>{formatDisplayDate(dateRange.start)} – {formatDisplayDate(dateRange.end)}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Tile 1: Total Fleet */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fleet</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCars}</div>
            <p className="text-xs text-muted-foreground">
              {stats.assignedCars} assigned, {stats.unassignedCars} unassigned
            </p>
          </CardContent>
        </Card>

        {/* Tile 2: Total Active Drivers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground">
              Currently on duty
            </p>
          </CardContent>
        </Card>

        {/* Tile 3: Net Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {stats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total earnings for timeframe
            </p>
          </CardContent>
        </Card>

        {/* Tile 4: Net Earnings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats.ownerNetEarnings || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              AED {(stats.ownerNetEarnings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              After commission & dues & expenses
            </p>
          </CardContent>
        </Card>

        {/* Tile 5: Total Commission */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">AED {(stats.totalDriverCommission || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              30% of net revenue
            </p>
          </CardContent>
        </Card>

        {/* Tile 6: Total Dues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dues</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">AED {(stats.totalDue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Timeframe-specific dues
            </p>
          </CardContent>
        </Card>

        {/* Tile 7: Total Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {stats.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Approved expenses in period</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="fleet">Fleet Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
          <TabsTrigger value="drivers">Active Drivers</TabsTrigger>
          <TabsTrigger value="performance">Car Performance</TabsTrigger>
          <TabsTrigger value="daily-profit">Daily Profit</TabsTrigger>
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
                      <div className="text-2xl font-bold text-green-600">AED {stats.totalEarnings.toLocaleString()}</div>
                      <div className="text-sm text-green-700">Total Earnings</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">AED {stats.totalExpenses.toLocaleString()}</div>
                      <div className="text-sm text-red-700">Total Expenses</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        AED {stats.netProfit.toLocaleString()}
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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                          <div className="text-center p-2 bg-amber-50 rounded">
                            <div className="text-base font-bold text-amber-600">AED {car.monthlyProfit.toLocaleString()}</div>
                            <div className="text-xs text-amber-700">Monthly Profit</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="text-base font-bold text-green-600">AED {car.totalEarnings.toLocaleString()}</div>
                            <div className="text-xs text-green-700">Total Earnings</div>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <div className="text-base font-bold text-red-600">AED {car.totalExpenses.toLocaleString()}</div>
                            <div className="text-xs text-red-700">Total Expenses</div>
                          </div>
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className={`text-base font-bold ${car.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              AED {car.totalNetProfit.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-700">Net Profit</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <div className="text-base font-bold text-purple-600">{car.totalWorkHours.toFixed(1)}h</div>
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
                                    <span>AED {driver.earnings.toFixed(0)}</span>
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

        {/* Daily Profit Tab */}
        <TabsContent value="daily-profit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Profit Analysis</CardTitle>
              <CardDescription>Daily earnings, driver commissions, dues, and owner profit breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {carPerformance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No profit data available for the selected period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {carPerformance.map((car) => {
                      // Calculate daily due based on the selected period
                      const startDate = new Date(dateRange.start)
                      const endDate = new Date(dateRange.end)
                      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                      
                      // Calculate daily due based on actual days in each month of the period
                      let totalDue = 0
                      let currentDate = new Date(startDate)
                      
                      while (currentDate <= endDate) {
                        const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
                        const dailyDueForThisMonth = car.monthlyDue / daysInCurrentMonth
                        
                        // Calculate days in this month that are within our range
                        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
                        
                        const rangeStart = currentDate > startDate ? currentDate : startDate
                        const rangeEnd = endDate < monthEnd ? endDate : monthEnd
                        const daysInRange = Math.max(0, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                        
                        // Add due for this month's portion
                        totalDue += dailyDueForThisMonth * daysInRange
                        
                        // Move to next month
                        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                      }
                      
                      // Calculate average daily due for display
                      const dailyDue = totalDue / totalDays
                      
                      // Use total amounts for the period (not daily averages)
                      const totalEarnings = car.totalEarnings
                      const totalExpenses = car.totalExpenses
                      const totalNetProfit = totalEarnings - totalExpenses
                      
                      // Driver commission (30% of net profit before dues)
                      const totalDriverCommission = totalNetProfit * 0.30
                      
                      // Owner profit after driver commission and total due
                      const totalOwnerProfit = totalNetProfit - totalDriverCommission - totalDue
                      
                      return (
                        <div key={car.carId} className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-green-50">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                                <CarIcon className="h-8 w-8 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold">{car.plateNumber}</h3>
                                <p className="text-gray-600">{car.model}</p>
                                <p className="text-sm text-gray-500">
                                  Driver: {car.currentDriverName || 'Unassigned'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-600 mb-1">Period: {totalDays} days</div>
                              <div className="text-sm text-gray-600">Daily Due: AED {dailyDue.toFixed(2)} (weighted by month)</div>
                            </div>
                          </div>
                          
                          {/* Daily Profit Breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-lg font-bold text-green-600">AED {totalEarnings.toFixed(2)}</div>
                              <div className="text-sm text-green-700">Total Earnings</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                              <div className="text-lg font-bold text-red-600">AED {totalExpenses.toFixed(2)}</div>
                              <div className="text-sm text-red-700">Total Expenses</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="text-lg font-bold text-blue-600">AED {totalNetProfit.toFixed(2)}</div>
                              <div className="text-sm text-blue-700">Total Net Profit</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="text-lg font-bold text-purple-600">AED {totalDriverCommission.toFixed(2)}</div>
                              <div className="text-sm text-purple-700">Driver Commission (30%)</div>
                            </div>
                            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
                              <div className={`text-lg font-bold ${totalOwnerProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                AED {totalOwnerProfit.toFixed(2)}
                              </div>
                              <div className="text-sm text-amber-700">Owner Total Profit</div>
                            </div>
                          </div>
                          
                          {/* Calculation Breakdown */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">Period Profit Calculation:</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Total Earnings ({totalDays} days):</span>
                                <span className="font-medium">AED {totalEarnings.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Expenses:</span>
                                <span className="font-medium">- AED {totalExpenses.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span>Total Net Profit:</span>
                                <span className="font-medium">AED {totalNetProfit.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Driver Commission (30%):</span>
                                <span className="font-medium">- AED {totalDriverCommission.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Due ({totalDays} days × AED {dailyDue.toFixed(2)} daily):</span>
                                <span className="font-medium">- AED {totalDue.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2 font-bold text-lg">
                                <span>Owner Total Profit:</span>
                                <span className={totalOwnerProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  AED {totalOwnerProfit.toFixed(2)}
                                </span>
                              </div>
                            </div>
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
      </Tabs>
    </div>
  )
}
