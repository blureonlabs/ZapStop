'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Download, RefreshCw, Filter, Calendar } from 'lucide-react'
import { toast } from 'sonner'

interface EarningsTransaction {
  id: string
  date: string
  carId: string
  carPlate: string
  carModel: string
  driverName: string
  revenue: number
  commission: number
  expenses: number
  dues: number
  netEarnings: number
  uberEarnings: number
  boltEarnings: number
  individualEarnings: number
  rideCounts: {
    uber: number
    bolt: number
    individual: number
  }
}

interface Car {
  id: string
  plate_number: string
  model: string
  monthly_due: number
  assigned_driver_id?: string
}

interface Driver {
  id: string
  name: string
  assigned_car_id?: string
}

export default function EarningsHistoryPage() {
  const { appUser } = useAuth()
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [selectedCars, setSelectedCars] = useState<string[]>([])
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<'last_month' | 'current_month' | 'last_3_months' | 'last_6_months' | 'custom'>('last_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20
  
  // Summary
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalExpenses: 0,
    totalDues: 0,
    netEarnings: 0
  })

  // Format date to YYYY-MM-DD string
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date()
    let start: Date, end: Date = new Date(now)
    
    switch (dateRange) {
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'last_6_months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'custom':
        if (!customStartDate || !customEndDate) {
          // Fallback to current month if custom dates are not set
          start = new Date(now.getFullYear(), now.getMonth(), 1)
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        } else {
          start = new Date(customStartDate)
          end = new Date(customEndDate)
        }
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      // Fallback to current month if dates are invalid
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }
    
    const result = {
      start: formatDate(start),
      end: formatDate(end)
    }
    
    console.log(`Date range for ${dateRange}:`, result)
    console.log('Start date object:', start)
    console.log('End date object:', end)
    
    return result
  }

  // Fetch owner's cars
  const fetchCars = useCallback(async () => {
    if (!appUser || appUser.role !== 'owner') return

    try {
      const { data: ownerData } = await supabase
        .from('owners')
        .select('id')
        .eq('email', appUser.email)
        .single()

      if (ownerData) {
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
          return
        }

        const ownerCars = carsData?.map(oc => oc.cars).filter(Boolean).flat() as Car[] || []
        setCars(ownerCars)
      }
    } catch (error) {
      console.error('Error fetching cars:', error)
    }
  }, [appUser])

  // Fetch drivers
  const fetchDrivers = useCallback(async () => {
    try {
      const { data: driversData } = await supabase
        .from('users')
        .select('id, name, assigned_car_id')
        .eq('role', 'driver')

      setDrivers(driversData || [])
    } catch (error) {
      console.error('Error fetching drivers:', error)
    }
  }, [])

  // Fetch earnings history
  const fetchEarningsHistory = useCallback(async (showRefresh = false) => {
    if (!appUser || appUser.role !== 'owner') return

    try {
      if (showRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const { start, end } = getDateRange()
      console.log('Fetching earnings history for date range:', { start, end })
      
      // Get owner's cars using owner_cars table
      const { data: ownerData } = await supabase
        .from('owners')
        .select('id')
        .eq('email', appUser.email)
        .single()

      if (!ownerData) return

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
        return
      }

      const ownerCars = carsData?.map(oc => oc.cars).filter(Boolean).flat() as Car[] || []
      console.log('Owner cars:', ownerCars)

      if (!ownerCars || ownerCars.length === 0) {
        console.log('No cars found for owner')
        setTransactions([])
        setSummary({ totalRevenue: 0, totalCommission: 0, totalExpenses: 0, totalDues: 0, netEarnings: 0 })
        return
      }

      const carIds = ownerCars.map(car => car.id)
      const driverIds = ownerCars
        .map(car => car.assigned_driver_id)
        .filter(Boolean) as string[]

      if (driverIds.length === 0) {
        setTransactions([])
        setSummary({ totalRevenue: 0, totalCommission: 0, totalExpenses: 0, totalDues: 0, netEarnings: 0 })
        return
      }

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
            individual_rides_account,
            uber_rides_count,
            bolt_rides_count,
            individual_rides_count
          )
        `)
        .in('car_id', carIds)
        .gte('date', start)
        .lte('date', end)

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
        .in('car_id', carIds)
        .gte('date', start)
        .lte('date', end)

      // Get driver names
      const allDriverIds = new Set<string>()
      earningsMappings?.forEach(mapping => {
        if (mapping.driver_earnings && 'driver_id' in mapping.driver_earnings) {
          allDriverIds.add(mapping.driver_earnings.driver_id as string)
        }
      })
      
      const { data: driversData } = await supabase
        .from('users')
        .select('id, name')
        .in('id', Array.from(allDriverIds))

      console.log('Earnings mappings:', earningsMappings)
      console.log('Expenses mappings:', expensesMappings)
      console.log('Drivers data:', driversData)
      console.log('Total earnings mappings found:', earningsMappings?.length || 0)

      // Process transactions
      const transactions: EarningsTransaction[] = []
      let totalRevenue = 0
      let totalCommission = 0
      let totalExpenses = 0
      let totalDues = 0

      // Create driver lookup map
      const driverMap = new Map<string, string>()
      driversData?.forEach(driver => {
        driverMap.set(driver.id, driver.name)
      })

      earningsMappings?.forEach(mapping => {
        const earning = mapping.driver_earnings as any
        const car = ownerCars.find(c => c.id === mapping.car_id)
        
        if (!earning || !car || !earning.driver_id) return
        
        const driverName = driverMap.get(earning.driver_id) || 'Unknown Driver'
        
        // Calculate revenue
        const revenue = (earning.uber_cash || 0) + (earning.uber_account || 0) + 
                      (earning.bolt_cash || 0) + (earning.bolt_account || 0) + 
                      (earning.individual_rides_cash || 0) + (earning.individual_rides_account || 0)
        
        // Calculate commission (30% of revenue)
        const commission = revenue * 0.30
        
        // Get expenses for this date and car
        const dailyExpenses = expensesMappings?.filter(exp => 
          exp.car_id === mapping.car_id && exp.date === mapping.date
        ).reduce((sum, exp) => {
          const expense = exp.driver_expenses as any
          return sum + (expense?.amount || 0)
        }, 0) || 0
        
        // Calculate daily dues
        const daysInMonth = new Date(new Date(mapping.date).getFullYear(), new Date(mapping.date).getMonth() + 1, 0).getDate()
        const dailyDues = (car.monthly_due || 0) / daysInMonth
        
        // Calculate net earnings
        const netEarnings = revenue - commission - dailyExpenses - dailyDues
        
        // Apply filters
        if (selectedCars.length > 0 && !selectedCars.includes(car.id)) return
        if (selectedDrivers.length > 0 && !selectedDrivers.includes(earning.driver_id)) return
        
        transactions.push({
          id: mapping.id,
          date: mapping.date,
          carId: car.id,
          carPlate: car.plate_number,
          carModel: car.model,
          driverName,
          revenue,
          commission,
          expenses: dailyExpenses,
          dues: dailyDues,
          netEarnings,
          uberEarnings: (earning.uber_cash || 0) + (earning.uber_account || 0),
          boltEarnings: (earning.bolt_cash || 0) + (earning.bolt_account || 0),
          individualEarnings: (earning.individual_rides_cash || 0) + (earning.individual_rides_account || 0),
          rideCounts: {
            uber: earning.uber_rides_count || 0,
            bolt: earning.bolt_rides_count || 0,
            individual: earning.individual_rides_count || 0
          }
        })
        
        totalRevenue += revenue
        totalCommission += commission
        totalExpenses += dailyExpenses
        totalDues += dailyDues
      })

      // Sort by date (newest first)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setTransactions(transactions)
      setSummary({
        totalRevenue,
        totalCommission,
        totalExpenses,
        totalDues,
        netEarnings: totalRevenue - totalCommission - totalExpenses - totalDues
      })
      
      // Calculate pagination
      setTotalPages(Math.ceil(transactions.length / itemsPerPage))
      setCurrentPage(1)

    } catch (error) {
      console.error('Error fetching earnings history:', error)
      toast.error('Failed to load earnings history')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [appUser, dateRange, customStartDate, customEndDate, selectedCars, selectedDrivers])

  // Apply filters
  const applyFilters = () => {
    fetchEarningsHistory()
  }

  // Clear filters
  const clearFilters = () => {
    setSelectedCars([])
    setSelectedDrivers([])
    setDateRange('last_month')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  // Export to PDF
  const exportToPDF = () => {
    // Simple PDF export using browser print
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      // Export ALL transactions, not just current page
      const allTransactions = transactions
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Earnings History - ${appUser?.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body { 
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                line-height: 1.5;
                color: #1f2937;
                background: white;
                margin: 0;
                padding: 20px;
              }
              
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 3px solid #3b82f6;
                padding-bottom: 20px;
              }
              
              .logo {
                font-size: 24px;
                font-weight: 700;
                color: #3b82f6;
                margin-bottom: 5px;
              }
              
              .subtitle {
                font-size: 14px;
                color: #6b7280;
                font-weight: 400;
              }
              
              .report-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 25px;
                padding: 15px;
                background: #f8fafc;
                border-radius: 8px;
                border-left: 4px solid #3b82f6;
              }
              
              .info-section {
                flex: 1;
              }
              
              .info-label {
                font-size: 10px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
                margin-bottom: 2px;
              }
              
              .info-value {
                font-size: 12px;
                color: #1f2937;
                font-weight: 500;
              }
              
              .summary {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                padding: 20px;
                border-radius: 12px;
                margin: 25px 0;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              
              .summary-title {
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 15px;
                text-align: center;
              }
              
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr);
                gap: 15px;
              }
              
              .summary-item {
                text-align: center;
                padding: 10px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              
              .summary-label {
                font-size: 10px;
                color: #6b7280;
                font-weight: 500;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .summary-value {
                font-size: 14px;
                font-weight: 700;
              }
              
              .revenue { color: #059669; }
              .commission { color: #7c3aed; }
              .expenses { color: #dc2626; }
              .dues { color: #ea580c; }
              .net { color: #059669; }
              
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 25px 0;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              }
              
              th { 
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              th:first-child { border-top-left-radius: 8px; }
              th:last-child { border-top-right-radius: 8px; }
              
              td { 
                border-bottom: 1px solid #e5e7eb;
                padding: 10px 8px;
                font-size: 11px;
                vertical-align: middle;
              }
              
              tr:nth-child(even) { background: #f9fafb; }
              tr:hover { background: #f3f4f6; }
              
              .date-cell { font-weight: 500; color: #374151; }
              .car-cell { font-weight: 500; }
              .driver-cell { color: #6b7280; }
              .amount-cell { text-align: right; font-weight: 600; }
              .positive { color: #059669; }
              .negative { color: #dc2626; }
              
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
                border-top: 1px solid #e5e7eb;
                padding-top: 15px;
              }
              
              @media print {
                body { margin: 0; padding: 15px; }
                .summary-grid { grid-template-columns: repeat(3, 1fr); }
                table { font-size: 10px; }
                th, td { padding: 8px 6px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">⚡ ZapStop</div>
              <div class="subtitle">Earnings History Report</div>
            </div>
            
            <div class="report-info">
              <div class="info-section">
                <div class="info-label">Owner</div>
                <div class="info-value">${appUser?.name}</div>
              </div>
              <div class="info-section">
                <div class="info-label">Period</div>
                <div class="info-value">${getDateRange().start} to ${getDateRange().end}</div>
              </div>
              <div class="info-section">
                <div class="info-label">Generated</div>
                <div class="info-value">${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
              <div class="info-section">
                <div class="info-label">Transactions</div>
                <div class="info-value">${allTransactions.length} total</div>
              </div>
            </div>
            
            <div class="summary">
              <div class="summary-title">Financial Summary</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-label">Total Revenue</div>
                  <div class="summary-value revenue">AED ${summary.totalRevenue.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Commission</div>
                  <div class="summary-value commission">AED ${summary.totalCommission.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Expenses</div>
                  <div class="summary-value expenses">AED ${summary.totalExpenses.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Total Dues</div>
                  <div class="summary-value dues">AED ${summary.totalDues.toLocaleString()}</div>
                </div>
                <div class="summary-item">
                  <div class="summary-label">Net Earnings</div>
                  <div class="summary-value net ${summary.netEarnings >= 0 ? 'positive' : 'negative'}">AED ${summary.netEarnings.toLocaleString()}</div>
                </div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Car</th>
                  <th>Driver</th>
                  <th>Revenue</th>
                  <th>Commission</th>
                  <th>Expenses</th>
                  <th>Dues</th>
                  <th>Net Earnings</th>
                </tr>
              </thead>
              <tbody>
                ${allTransactions.map(t => `
                  <tr>
                    <td class="date-cell">${new Date(t.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</td>
                    <td class="car-cell">${t.carPlate}<br><small style="color: #6b7280;">${t.carModel}</small></td>
                    <td class="driver-cell">${t.driverName}</td>
                    <td class="amount-cell positive">AED ${t.revenue.toFixed(2)}</td>
                    <td class="amount-cell commission">AED ${t.commission.toFixed(2)}</td>
                    <td class="amount-cell expenses">AED ${t.expenses.toFixed(2)}</td>
                    <td class="amount-cell dues">AED ${t.dues.toFixed(2)}</td>
                    <td class="amount-cell ${t.netEarnings >= 0 ? 'positive' : 'negative'}">AED ${t.netEarnings.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>This report was generated by ZapStop Fleet Management System</p>
              <p>For questions or support, contact your system administrator</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      
      // Handle print completion and window closure
      printWindow.onbeforeunload = () => {
        // Focus back to the main window
        window.focus()
      }
      
      // Listen for print dialog close
      printWindow.onafterprint = () => {
        // Close the print window after printing
        printWindow.close()
        // Focus back to the main window
        window.focus()
      }
      
      // Start the print process
      printWindow.print()
      
      // Fallback: close window after a delay if print events don't fire
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close()
          window.focus()
        }
      }, 1000)
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchCars()
    fetchDrivers()
  }, [fetchCars, fetchDrivers])

  useEffect(() => {
    fetchEarningsHistory()
  }, [fetchEarningsHistory])

  if (!appUser || appUser.role !== 'owner') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">This page is only accessible to owners.</p>
      </div>
    )
  }

  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Earnings History</h1>
          <p className="text-gray-600">Transaction history for your fleet</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => fetchEarningsHistory(true)}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Car Filter */}
            <div>
              <Label htmlFor="cars">Cars</Label>
              <Select 
                value={selectedCars.length > 0 ? selectedCars[0] : 'all'} 
                onValueChange={(value) => setSelectedCars(value === 'all' ? [] : [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cars" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cars</SelectItem>
                  {cars.map(car => (
                    <SelectItem key={car.id} value={car.id}>
                      {car.plate_number} - {car.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Driver Filter */}
            <div>
              <Label htmlFor="drivers">Drivers</Label>
              <Select 
                value={selectedDrivers.length > 0 ? selectedDrivers[0] : 'all'} 
                onValueChange={(value) => setSelectedDrivers(value === 'all' ? [] : [value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters}>
              Apply Filters
            </Button>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              AED {summary.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              AED {summary.totalCommission.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              AED {summary.totalExpenses.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              AED {summary.totalDues.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              AED {summary.netEarnings.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Showing {currentTransactions.length} of {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          ) : currentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No transactions found for the selected filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Car</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Dues</TableHead>
                      <TableHead className="text-right">Net Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.carPlate}</div>
                            <div className="text-sm text-gray-500">{transaction.carModel}</div>
                          </div>
                        </TableCell>
                        <TableCell>{transaction.driverName}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          AED {transaction.revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-purple-600">
                          AED {transaction.commission.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          AED {transaction.expenses.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          AED {transaction.dues.toFixed(2)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${transaction.netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          AED {transaction.netEarnings.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
