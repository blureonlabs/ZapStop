'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, User, DriverEarning, DriverExpense } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Edit3, 
  Plus, 
  Upload, 
  Calendar, 
  Filter, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Receipt,
  Users,
  Clock,
  FileText,
  Download,
  Trash2,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { parseCSV, generateCSVTemplate, ParsedCSVData, EarningsCSVRow, ExpensesCSVRow } from '@/lib/csvParser'

interface EarningsFormData {
  driver_id: string
  date: string
  uber_cash: number
  uber_account: number
  bolt_cash: number
  bolt_account: number
  uber_rides_count: number
  bolt_rides_count: number
  individual_rides_count: number
  individual_rides_cash: number
  individual_rides_account: number
  notes?: string
}

interface ExpensesFormData {
  driver_id: string
  date: string
  expense_type: string
  amount: number
  description: string
  proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
}

interface CSVUploadData {
  earnings: EarningsCSVRow[]
  expenses: ExpensesCSVRow[]
}

export default function ManualUpdatePanel() {
  const { appUser } = useAuth()
  const [drivers, setDrivers] = useState<User[]>([])
  const [earnings, setEarnings] = useState<DriverEarning[]>([])
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'earnings' | 'expenses' | 'csv-upload' | 'calendar'>('earnings')
  
  // Earnings state
  const [earningsForm, setEarningsForm] = useState<EarningsFormData>({
    driver_id: '',
    date: new Date().toISOString().split('T')[0],
    uber_cash: 0,
    uber_account: 0,
    bolt_cash: 0,
    bolt_account: 0,
    uber_rides_count: 0,
    bolt_rides_count: 0,
    individual_rides_count: 0,
    individual_rides_cash: 0,
    individual_rides_account: 0,
    notes: ''
  })
  const [editingEarning, setEditingEarning] = useState<DriverEarning | null>(null)
  const [showEarningsDialog, setShowEarningsDialog] = useState(false)
  
  // Expenses state
  const [expensesForm, setExpensesForm] = useState<ExpensesFormData>({
    driver_id: '',
    date: new Date().toISOString().split('T')[0],
    expense_type: 'charging',
    amount: 0,
    description: '',
    proof_url: '',
    status: 'pending'
  })
  const [editingExpense, setEditingExpense] = useState<DriverExpense | null>(null)
  const [showExpensesDialog, setShowExpensesDialog] = useState(false)
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  
  // Filters
  const [dateFilter, setDateFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // CSV Upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvPreview, setCsvPreview] = useState<ParsedCSVData | null>(null)
  const [showCsvDialog, setShowCsvDialog] = useState(false)
  const [csvType, setCsvType] = useState<'earnings' | 'expenses'>('earnings')
  const [csvErrors, setCsvErrors] = useState<string[]>([])

  // Check if user has permission (admin or accountant)
  const hasPermission = appUser?.role === 'admin' || appUser?.role === 'accountant'

  useEffect(() => {
    if (hasPermission) {
      fetchData()
    }
  }, [hasPermission])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch only drivers for expense management (not owners)
      const { data: driversData, error: driversError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'driver') // Only drivers, not owners
        .order('name')
      
      if (driversError) throw driversError
      setDrivers(driversData || [])
      
      // Fetch earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('driver_earnings')
        .select(`
          *,
          users!driver_earnings_driver_id_fkey (
            id,
            name,
            email
          )
        `)
        .order('date', { ascending: false })
        .limit(100)
      
      if (earningsError) throw earningsError
      setEarnings(earningsData || [])
      
      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('driver_expenses')
        .select(`
          *,
          users!driver_expenses_driver_id_fkey (
            id,
            name,
            email
          )
        `)
        .order('date', { ascending: false })
        .limit(100)
      
      if (expensesError) throw expensesError
      setExpenses(expensesData || [])
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleEarningsSubmit = async () => {
    try {
      // Validation
      if (!earningsForm.driver_id || !earningsForm.date) {
        toast.error('Driver and date are required')
        return
      }
      
      const totalEarnings = earningsForm.uber_cash + earningsForm.uber_account + 
                           earningsForm.bolt_cash + earningsForm.bolt_account + 
                           earningsForm.individual_rides_cash + earningsForm.individual_rides_account
      
      if (totalEarnings <= 0) {
        toast.error('At least one earning amount must be greater than 0')
        return
      }
      
      if (editingEarning) {
        // Update existing earning
        const { error } = await supabase
          .from('driver_earnings')
          .update({
            uber_cash: earningsForm.uber_cash,
            uber_account: earningsForm.uber_account,
            bolt_cash: earningsForm.bolt_cash,
            bolt_account: earningsForm.bolt_account,
            uber_rides_count: earningsForm.uber_rides_count,
            bolt_rides_count: earningsForm.bolt_rides_count,
            individual_rides_count: earningsForm.individual_rides_count,
            individual_rides_cash: earningsForm.individual_rides_cash,
            individual_rides_account: earningsForm.individual_rides_account,
            notes: earningsForm.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEarning.id)
        
        if (error) throw error
        toast.success('Earning updated successfully')
      } else {
        // Create new earning
        const { error } = await supabase
          .from('driver_earnings')
          .insert([earningsForm])
        
        if (error) throw error
        toast.success('Earning created successfully')
      }
      
      // Log the action
      await logAction('earnings', editingEarning ? 'update' : 'create', {
        driver_id: earningsForm.driver_id,
        date: earningsForm.date,
        total_amount: totalEarnings
      })
      
      setShowEarningsDialog(false)
      setEditingEarning(null)
      resetEarningsForm()
      fetchData()
      
    } catch (error) {
      console.error('Error saving earning:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to save earning: ${errorMessage}`)
    }
  }

  const handleExpensesSubmit = async () => {
    try {
      // Simple validation
      if (!expensesForm.driver_id || !expensesForm.date || !expensesForm.amount) {
        toast.error('Driver, date, and amount are required')
        return
      }
      
      if (expensesForm.amount <= 0) {
        toast.error('Amount must be greater than 0')
        return
      }

      // Clean data object
      const expenseData = {
        driver_id: expensesForm.driver_id,
        date: expensesForm.date,
        expense_type: expensesForm.expense_type,
        amount: Number(expensesForm.amount),
        description: expensesForm.description || '',
        proof_url: expensesForm.proof_url || null,
        status: expensesForm.status || 'pending'
      }

      console.log('Saving expense:', expenseData)

      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('driver_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
        
        if (error) {
          console.error('Update error:', error)
          throw error
        }
        toast.success('Expense updated successfully')
      } else {
        // Create new expense
        const { error } = await supabase
          .from('driver_expenses')
          .insert([expenseData])
        
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
        toast.success('Expense created successfully')
      }
      
      // Close dialog and refresh
      setShowExpensesDialog(false)
      setEditingExpense(null)
      resetExpensesForm()
      fetchData()
      
    } catch (error) {
      console.error('Error saving expense:', error)
      toast.error(`Failed to save expense: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleBulkApproveExpenses = async () => {
    if (selectedExpenses.length === 0) {
      toast.error('Please select expenses to approve')
      return
    }
    
    try {
      const { error } = await supabase
        .from('driver_expenses')
        .update({
          status: 'approved',
          approved_by: appUser?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', selectedExpenses)
      
      if (error) throw error
      
      // Log the action
      await logAction('expenses', 'bulk_approve', {
        expense_ids: selectedExpenses,
        count: selectedExpenses.length
      })
      
      toast.success(`${selectedExpenses.length} expenses approved successfully`)
      setSelectedExpenses([])
      fetchData()
      
    } catch (error) {
      console.error('Error approving expenses:', error)
      toast.error('Failed to approve expenses')
    }
  }

  const handleDeleteEarning = async (earningId: string) => {
    try {
      const { error } = await supabase
        .from('driver_earnings')
        .delete()
        .eq('id', earningId)
      
      if (error) throw error
      
      // Log the action
      await logAction('earnings', 'delete', { earning_id: earningId })
      
      toast.success('Earning deleted successfully')
      fetchData()
      
    } catch (error) {
      console.error('Error deleting earning:', error)
      toast.error('Failed to delete earning')
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('driver_expenses')
        .delete()
        .eq('id', expenseId)
      
      if (error) throw error
      
      // Log the action
      await logAction('expenses', 'delete', { expense_id: expenseId })
      
      toast.success('Expense deleted successfully')
      fetchData()
      
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const logAction = async (type: 'earnings' | 'expenses', action: string, data: any) => {
    try {
      // Check if admin_audit_logs table exists before trying to insert
      const { error } = await supabase
        .from('admin_audit_logs')
        .insert([{
          admin_id: appUser?.id,
          action_type: `${type}_${action}`,
          target_type: type,
          target_id: data.id || data.earning_id || data.expense_id,
          details: JSON.stringify(data),
          created_at: new Date().toISOString()
        }])
      
      if (error) {
        console.warn('Could not log action to admin_audit_logs:', error.message)
        // Don't throw error - this is not critical for the main functionality
      }
    } catch (error) {
      console.warn('Error logging action (non-critical):', error)
      // Don't throw error - this is not critical for the main functionality
    }
  }

  const resetEarningsForm = () => {
    setEarningsForm({
      driver_id: '',
      date: new Date().toISOString().split('T')[0],
      uber_cash: 0,
      uber_account: 0,
      bolt_cash: 0,
      bolt_account: 0,
      uber_rides_count: 0,
      bolt_rides_count: 0,
      individual_rides_count: 0,
      individual_rides_cash: 0,
      individual_rides_account: 0,
      notes: ''
    })
  }

  const resetExpensesForm = () => {
    setExpensesForm({
      driver_id: '',
      date: new Date().toISOString().split('T')[0],
      expense_type: 'charging',
      amount: 0,
      description: '',
      proof_url: '',
      status: 'pending'
    })
  }

  const handleCSVUpload = async (file: File) => {
    try {
      const content = await file.text()
      const parsed = parseCSV(content)
      
      setCsvPreview(parsed)
      setCsvErrors(parsed.errors)
      
      if (parsed.errors.length > 0) {
        toast.error(`CSV parsing completed with ${parsed.errors.length} errors`)
      } else {
        toast.success('CSV parsed successfully')
      }
      
      setShowCsvDialog(true)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      toast.error('Failed to parse CSV file')
    }
  }

  const handleCSVApply = async () => {
    if (!csvPreview) return

    try {
      let successCount = 0
      let errorCount = 0

      // Process earnings
      if (csvPreview.earnings.length > 0) {
        for (const earningRow of csvPreview.earnings) {
          try {
            // Find driver by name or email
            const driver = drivers.find(d => 
              d.name.toLowerCase() === earningRow.driver_name.toLowerCase() ||
              d.email.toLowerCase() === earningRow.driver_email.toLowerCase()
            )

            if (!driver) {
              errorCount++
              continue
            }

            const earningData = {
              driver_id: driver.id,
              date: earningRow.date,
              uber_cash: earningRow.uber_cash,
              uber_account: earningRow.uber_account,
              bolt_cash: earningRow.bolt_cash,
              bolt_account: earningRow.bolt_account,
              uber_rides_count: earningRow.uber_rides_count,
              bolt_rides_count: earningRow.bolt_rides_count,
              individual_rides_count: earningRow.individual_rides_count,
              individual_rides_cash: earningRow.individual_rides_cash,
              individual_rides_account: earningRow.individual_rides_account,
              notes: earningRow.notes
            }

            const { error } = await supabase
              .from('driver_earnings')
              .upsert([earningData], { onConflict: 'driver_id,date' })

            if (error) throw error
            successCount++

            // Log the action
            await logAction('earnings', 'csv_import', {
              driver_id: driver.id,
              date: earningRow.date,
              total_amount: earningRow.uber_cash + earningRow.uber_account + 
                           earningRow.bolt_cash + earningRow.bolt_account + 
                           earningRow.individual_rides_cash + earningRow.individual_rides_account
            })
          } catch (error) {
            console.error('Error importing earning:', error)
            errorCount++
          }
        }
      }

      // Process expenses
      if (csvPreview.expenses.length > 0) {
        for (const expenseRow of csvPreview.expenses) {
          try {
            // Find driver by name or email
            const driver = drivers.find(d => 
              d.name.toLowerCase() === expenseRow.driver_name.toLowerCase() ||
              d.email.toLowerCase() === expenseRow.driver_email.toLowerCase()
            )

            if (!driver) {
              errorCount++
              continue
            }

            const expenseData = {
              driver_id: driver.id,
              date: expenseRow.date,
              expense_type: expenseRow.expense_type,
              amount: expenseRow.amount,
              description: expenseRow.description,
              proof_url: expenseRow.proof_url || null,
              status: expenseRow.status as 'pending' | 'approved' | 'rejected'
            }

            const { error } = await supabase
              .from('driver_expenses')
              .insert([expenseData])

            if (error) throw error
            successCount++

            // Log the action
            await logAction('expenses', 'csv_import', {
              driver_id: driver.id,
              date: expenseRow.date,
              amount: expenseRow.amount,
              type: expenseRow.expense_type
            })
          } catch (error) {
            console.error('Error importing expense:', error)
            errorCount++
          }
        }
      }

      toast.success(`CSV import completed: ${successCount} records imported, ${errorCount} errors`)
      setShowCsvDialog(false)
      setCsvPreview(null)
      setCsvFile(null)
      fetchData()

    } catch (error) {
      console.error('Error applying CSV data:', error)
      toast.error('Failed to apply CSV data')
    }
  }

  const downloadTemplate = (type: 'earnings' | 'expenses') => {
    const template = generateCSVTemplate(type)
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const generateCalendarDays = () => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    // Get first day of current month
    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    
    // Get the day of week for first day (0 = Sunday)
    const startDay = firstDay.getDay()
    
    // Get last day of previous month
    const prevMonth = new Date(currentYear, currentMonth, 0)
    const daysInPrevMonth = prevMonth.getDate()
    
    const days = []
    
    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i
      days.push({
        day,
        date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false
      })
    }
    
    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear
      
      days.push({
        day,
        date: dateStr,
        isCurrentMonth: true,
        isToday
      })
    }
    
    // Add days from next month to fill the grid (42 days total for 6 weeks)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = currentMonth + 2 > 11 ? 0 : currentMonth + 2
      const nextYear = currentMonth + 2 > 11 ? currentYear + 1 : currentYear
      
      days.push({
        day,
        date: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isCurrentMonth: false,
        isToday: false
      })
    }
    
    return days
  }

  const openEarningsDialog = (earning?: DriverEarning) => {
    if (earning) {
      setEditingEarning(earning)
      setEarningsForm({
        driver_id: earning.driver_id,
        date: earning.date,
        uber_cash: earning.uber_cash,
        uber_account: earning.uber_account,
        bolt_cash: earning.bolt_cash,
        bolt_account: earning.bolt_account,
        uber_rides_count: earning.uber_rides_count,
        bolt_rides_count: earning.bolt_rides_count,
        individual_rides_count: earning.individual_rides_count,
        individual_rides_cash: earning.individual_rides_cash,
        individual_rides_account: earning.individual_rides_account,
        notes: earning.notes || ''
      })
    } else {
      setEditingEarning(null)
      resetEarningsForm()
    }
    setShowEarningsDialog(true)
  }

  const openExpensesDialog = (expense?: DriverExpense) => {
    if (expense) {
      setEditingExpense(expense)
      setExpensesForm({
        driver_id: expense.driver_id,
        date: expense.date,
        expense_type: expense.expense_type,
        amount: expense.amount,
        description: expense.description || '',
        proof_url: expense.proof_url || '',
        status: expense.status
      })
    } else {
      setEditingExpense(null)
      resetExpensesForm()
    }
    setShowExpensesDialog(true)
  }

  // Filter data based on current filters
  const filteredEarnings = earnings.filter(earning => {
    if (dateFilter && dateFilter !== 'all' && earning.date !== dateFilter) return false
    if (driverFilter && driverFilter !== 'all' && earning.driver_id !== driverFilter) return false
    return true
  })

  const filteredExpenses = expenses.filter(expense => {
    if (dateFilter && dateFilter !== 'all' && expense.date !== dateFilter) return false
    if (driverFilter && driverFilter !== 'all' && expense.driver_id !== driverFilter) return false
    if (statusFilter && statusFilter !== 'all' && expense.status !== statusFilter) return false
    return true
  })

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <XCircle className="h-12 w-12 mx-auto mb-4" />
            <p>You don't have permission to access this panel.</p>
            <p className="text-sm">Only admins and accountants can manage earnings and expenses.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Manual Update Panel
        </CardTitle>
        <CardDescription>
          Manage driver earnings and expenses manually. All changes are logged for audit purposes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="earnings" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Earnings
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="csv-upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              CSV Upload
            </TabsTrigger>
          </TabsList>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter" className="text-sm font-medium">Filter by date:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter === 'all' ? '' : dateFilter}
                      onChange={(e) => setDateFilter(e.target.value || 'all')}
                      className="w-40"
                    />
                    {dateFilter && dateFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateFilter('all')}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All drivers</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={() => openEarningsDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Earning
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Uber</TableHead>
                    <TableHead>Bolt</TableHead>
                    <TableHead>Individual</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEarnings.map((earning) => {
                    const total = earning.uber_cash + earning.uber_account + 
                                earning.bolt_cash + earning.bolt_account + 
                                earning.individual_rides_cash + earning.individual_rides_account
                    return (
                      <TableRow key={earning.id}>
                        <TableCell>{(earning as any).users?.name || 'Unknown'}</TableCell>
                        <TableCell>{earning.date}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Cash: {earning.uber_cash}</div>
                            <div>Account: {earning.uber_account}</div>
                            <div className="text-xs text-gray-500">Rides: {earning.uber_rides_count}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Cash: {earning.bolt_cash}</div>
                            <div>Account: {earning.bolt_account}</div>
                            <div className="text-xs text-gray-500">Rides: {earning.bolt_rides_count}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Cash: {earning.individual_rides_cash}</div>
                            <div>Account: {earning.individual_rides_account}</div>
                            <div className="text-xs text-gray-500">Rides: {earning.individual_rides_count}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{total.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEarningsDialog(earning)}
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteEarning(earning.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="expense-date-filter" className="text-sm font-medium">Filter by date:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="expense-date-filter"
                      type="date"
                      value={dateFilter === 'all' ? '' : dateFilter}
                      onChange={(e) => setDateFilter(e.target.value || 'all')}
                      className="w-40"
                    />
                    {dateFilter && dateFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateFilter('all')}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All drivers</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                {selectedExpenses.length > 0 && (
                  <Button onClick={handleBulkApproveExpenses} variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Selected ({selectedExpenses.length})
                  </Button>
                )}
                <Button onClick={() => openExpensesDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExpenses(filteredExpenses.map(e => e.id))
                          } else {
                            setSelectedExpenses([])
                          }
                        }}
                        checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                      />
                    </TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedExpenses.includes(expense.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExpenses([...selectedExpenses, expense.id])
                            } else {
                              setSelectedExpenses(selectedExpenses.filter(id => id !== expense.id))
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{(expense as any).users?.name || 'Unknown'}</TableCell>
                      <TableCell>{expense.date}</TableCell>
                      <TableCell>{expense.expense_type}</TableCell>
                      <TableCell className="font-medium">{expense.amount.toFixed(2)}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={expense.status === 'approved' ? 'default' : 
                                  expense.status === 'rejected' ? 'destructive' : 'secondary'}
                        >
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openExpensesDialog(expense)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Calendar View Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="calendar-date-filter" className="text-sm font-medium">Filter by date:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="calendar-date-filter"
                      type="date"
                      value={dateFilter === 'all' ? '' : dateFilter}
                      onChange={(e) => setDateFilter(e.target.value || 'all')}
                      className="w-40"
                    />
                    {dateFilter && dateFilter !== 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDateFilter('all')}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <Select value={driverFilter} onValueChange={setDriverFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All drivers</SelectItem>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="text-sm text-gray-500">
                Git-commit style calendar view showing activity by date
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {generateCalendarDays().map((day, index) => {
                  const dayEarnings = earnings.filter(e => e.date === day.date && (!driverFilter || driverFilter === 'all' || e.driver_id === driverFilter))
                  const dayExpenses = expenses.filter(e => e.date === day.date && (!driverFilter || driverFilter === 'all' || e.driver_id === driverFilter))
                  const hasActivity = dayEarnings.length > 0 || dayExpenses.length > 0
                  
                  return (
                    <div
                      key={index}
                      className={`
                        aspect-square p-1 text-xs cursor-pointer rounded
                        ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                        ${day.isToday ? 'bg-blue-100 font-bold' : ''}
                        ${hasActivity ? 'bg-green-100 hover:bg-green-200' : 'hover:bg-gray-50'}
                      `}
                      onClick={() => {
                        if (hasActivity) {
                          setDateFilter(day.date)
                          setActiveTab('earnings')
                        }
                      }}
                      title={`${day.date}: ${dayEarnings.length} earnings, ${dayExpenses.length} expenses`}
                    >
                      <div className="text-center">{day.day}</div>
                      {hasActivity && (
                        <div className="flex justify-center gap-0.5 mt-1">
                          {dayEarnings.length > 0 && (
                            <div className="w-1 h-1 bg-green-500 rounded-full" title={`${dayEarnings.length} earnings`}></div>
                          )}
                          {dayExpenses.length > 0 && (
                            <div className="w-1 h-1 bg-red-500 rounded-full" title={`${dayExpenses.length} expenses`}></div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Legend</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-green-100 rounded"></div>
                    <span>Days with activity</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span>Earnings recorded</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                    <span>Expenses recorded</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 bg-blue-100 rounded"></div>
                    <span>Today</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Earnings Records:</span>
                    <span className="font-medium">{earnings.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Expenses Records:</span>
                    <span className="font-medium">{expenses.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Active Days:</span>
                    <span className="font-medium">
                      {new Set([...earnings.map(e => e.date), ...expenses.map(e => e.date)]).size}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CSV Upload Tab */}
          <TabsContent value="csv-upload" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload CSV File</CardTitle>
                  <CardDescription>
                    Upload earnings or expenses data from a CSV file. Preview and edit before applying changes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 mb-4">
                      Choose a CSV file to upload
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setCsvFile(file)
                          handleCSVUpload(file)
                        }
                      }}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload">
                      <Button asChild>
                        <span>Choose CSV File</span>
                      </Button>
                    </label>
                  </div>
                  
                  {csvFile && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Selected: {csvFile.name}
                      </p>
                      <p className="text-xs text-blue-600">
                        Size: {(csvFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Download Templates</CardTitle>
                  <CardDescription>
                    Download CSV templates to see the required format for uploads.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => downloadTemplate('earnings')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Earnings Template
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => downloadTemplate('expenses')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Expenses Template
                  </Button>
                </CardContent>
              </Card>
            </div>

            {csvErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">CSV Parsing Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {csvErrors.map((error, index) => (
                      <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Earnings Dialog */}
        <Dialog open={showEarningsDialog} onOpenChange={setShowEarningsDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEarning ? 'Edit Earning' : 'Add New Earning'}
              </DialogTitle>
              <DialogDescription>
                {editingEarning ? 'Update the earning details below.' : 'Enter the earning details below.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driver">Driver</Label>
                <Select value={earningsForm.driver_id} onValueChange={(value) => 
                  setEarningsForm({...earningsForm, driver_id: value})
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={earningsForm.date}
                  onChange={(e) => setEarningsForm({...earningsForm, date: e.target.value})}
                  disabled={editingEarning !== null}
                  className={editingEarning ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                {editingEarning && (
                  <p className="text-xs text-gray-500 mt-1">
                    Date cannot be changed for existing records
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Uber Earnings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="uber_cash">Cash</Label>
                  <Input
                    id="uber_cash"
                    type="number"
                    step="0.01"
                    value={earningsForm.uber_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_cash: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="uber_account">Account</Label>
                  <Input
                    id="uber_account"
                    type="number"
                    step="0.01"
                    value={earningsForm.uber_account}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_account: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="uber_rides_count">Ride Count</Label>
                  <Input
                    id="uber_rides_count"
                    type="number"
                    value={earningsForm.uber_rides_count}
                    onChange={(e) => setEarningsForm({...earningsForm, uber_rides_count: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Bolt Earnings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bolt_cash">Cash</Label>
                  <Input
                    id="bolt_cash"
                    type="number"
                    step="0.01"
                    value={earningsForm.bolt_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_cash: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="bolt_account">Account</Label>
                  <Input
                    id="bolt_account"
                    type="number"
                    step="0.01"
                    value={earningsForm.bolt_account}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_account: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="bolt_rides_count">Ride Count</Label>
                  <Input
                    id="bolt_rides_count"
                    type="number"
                    value={earningsForm.bolt_rides_count}
                    onChange={(e) => setEarningsForm({...earningsForm, bolt_rides_count: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Individual Earnings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="individual_rides_cash">Cash</Label>
                  <Input
                    id="individual_rides_cash"
                    type="number"
                    step="0.01"
                    value={earningsForm.individual_rides_cash}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_rides_cash: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="individual_rides_account">Account</Label>
                  <Input
                    id="individual_rides_account"
                    type="number"
                    step="0.01"
                    value={earningsForm.individual_rides_account}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_rides_account: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="individual_rides_count">Ride Count</Label>
                  <Input
                    id="individual_rides_count"
                    type="number"
                    value={earningsForm.individual_rides_count}
                    onChange={(e) => setEarningsForm({...earningsForm, individual_rides_count: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={earningsForm.notes}
                onChange={(e) => setEarningsForm({...earningsForm, notes: e.target.value})}
                placeholder="Optional notes..."
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEarningsDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEarningsSubmit}>
                {editingEarning ? 'Update' : 'Create'} Earning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expenses Dialog */}
        <Dialog open={showExpensesDialog} onOpenChange={setShowExpensesDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </DialogTitle>
              <DialogDescription>
                {editingExpense ? 'Update the expense details below.' : 'Enter the expense details below.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense_driver">Driver</Label>
                  <Select value={expensesForm.driver_id} onValueChange={(value) => 
                    setExpensesForm({...expensesForm, driver_id: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={expensesForm.date}
                    onChange={(e) => setExpensesForm({...expensesForm, date: e.target.value})}
                    disabled={editingExpense !== null}
                    className={editingExpense ? "bg-gray-100 cursor-not-allowed" : ""}
                  />
                  {editingExpense && (
                    <p className="text-xs text-gray-500 mt-1">
                      Date cannot be changed for existing records
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense_type">Type</Label>
                  <Select value={expensesForm.expense_type} onValueChange={(value) => 
                    setExpensesForm({...expensesForm, expense_type: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="charging">Charging</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="toll">Toll</SelectItem>
                      <SelectItem value="parking">Parking</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="expense_amount">Amount</Label>
                  <Input
                    id="expense_amount"
                    type="number"
                    step="0.01"
                    value={expensesForm.amount}
                    onChange={(e) => setExpensesForm({...expensesForm, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="expense_description">Description (Optional)</Label>
                <Textarea
                  id="expense_description"
                  value={expensesForm.description}
                  onChange={(e) => setExpensesForm({...expensesForm, description: e.target.value})}
                  placeholder="Describe the expense..."
                />
              </div>

              <div>
                <Label htmlFor="expense_proof">Proof URL (Optional)</Label>
                <Input
                  id="expense_proof"
                  value={expensesForm.proof_url}
                  onChange={(e) => setExpensesForm({...expensesForm, proof_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              {editingExpense && (
                <div>
                  <Label htmlFor="expense_status">Status</Label>
                  <Select value={expensesForm.status} onValueChange={(value: any) => 
                    setExpensesForm({...expensesForm, status: value})
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExpensesDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleExpensesSubmit}>
                {editingExpense ? 'Update' : 'Create'} Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CSV Preview Dialog */}
        <Dialog open={showCsvDialog} onOpenChange={setShowCsvDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>CSV Preview</DialogTitle>
              <DialogDescription>
                Review the parsed data before applying changes to the database.
              </DialogDescription>
            </DialogHeader>
            
            {csvPreview && (
              <div className="space-y-6">
                {csvPreview.earnings.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Earnings ({csvPreview.earnings.length} records)</h4>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Driver</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Uber Cash</TableHead>
                            <TableHead>Uber Account</TableHead>
                            <TableHead>Bolt Cash</TableHead>
                            <TableHead>Bolt Account</TableHead>
                            <TableHead>Individual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.earnings.map((earning, index) => (
                            <TableRow key={index}>
                              <TableCell>{earning.driver_name}</TableCell>
                              <TableCell>{earning.date}</TableCell>
                              <TableCell>{earning.uber_cash}</TableCell>
                              <TableCell>{earning.uber_account}</TableCell>
                              <TableCell>{earning.bolt_cash}</TableCell>
                              <TableCell>{earning.bolt_account}</TableCell>
                              <TableCell>{earning.individual_rides_cash + earning.individual_rides_account}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {csvPreview.expenses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Expenses ({csvPreview.expenses.length} records)</h4>
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Driver</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvPreview.expenses.map((expense, index) => (
                            <TableRow key={index}>
                              <TableCell>{expense.driver_name}</TableCell>
                              <TableCell>{expense.date}</TableCell>
                              <TableCell>{expense.expense_type}</TableCell>
                              <TableCell>{expense.amount}</TableCell>
                              <TableCell className="max-w-xs truncate">{expense.description}</TableCell>
                              <TableCell>{expense.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {csvErrors.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3 text-red-600">Errors ({csvErrors.length})</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {csvErrors.map((error, index) => (
                        <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCsvDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCSVApply}
                disabled={csvErrors.length > 0}
              >
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
