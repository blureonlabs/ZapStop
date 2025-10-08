'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Receipt, ArrowLeft, TrendingUp, Calendar, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface DriverExpense {
  id: string
  driver_id: string
  date: string
  amount: number
  description: string
  expense_type: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  users?: {
    name: string
    email: string
  }
}

export default function ExpensesPage() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [averageDaily, setAverageDaily] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([])
  const [approving, setApproving] = useState(false)
  const itemsPerPage = 50

  useEffect(() => {
    if (appUser) {
      fetchExpenses(1, true)
    }
  }, [appUser, statusFilter])

  const fetchExpenses = async (page = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setCurrentPage(1)
        setExpenses([])
      }
      
      const authUserId = appUser?.id
      if (!authUserId) return

      let query = supabase
        .from('driver_expenses')
        .select(`
          *,
          users!driver_expenses_driver_id_fkey(name, email)
        `)
        .order('date', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)

      // If user is admin, show all expenses. Otherwise, show only their own
      if (appUser?.role !== 'admin') {
        query = query.eq('driver_id', authUserId)
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: expensesData, error: expensesError } = await query

      if (expensesError) {
        console.error('Error fetching expenses:', {
          message: expensesError.message,
          code: expensesError.code,
          details: expensesError.details,
          hint: expensesError.hint,
          fullError: expensesError
        })
        toast.error(`Failed to load expenses: ${expensesError.message}`)
      } else {
        const newExpenses = expensesData || []
        
        if (reset) {
          setExpenses(newExpenses)
        } else {
          setExpenses(prev => [...prev, ...newExpenses])
        }
        
        setHasMore(newExpenses.length === itemsPerPage)
        setCurrentPage(page)
        
        // Calculate totals for all loaded expenses
        const allExpenses = reset ? newExpenses : [...expenses, ...newExpenses]
        const total = allExpenses.reduce((sum, expense) => sum + expense.amount, 0)
        setTotalExpenses(total)
        setAverageDaily(allExpenses.length ? total / allExpenses.length : 0)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Failed to load expenses data')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchExpenses(currentPage + 1, false)
    }
  }

  const handleApproveExpense = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      setApproving(true)
      const { error } = await supabase
        .from('driver_expenses')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', expenseId)

      if (error) throw error

      toast.success(`Expense ${status} successfully`)
      
      // Update local state
      setExpenses(prev => prev.map(expense => 
        expense.id === expenseId 
          ? { ...expense, status }
          : expense
      ))
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error(`Failed to ${status} expense`)
    } finally {
      setApproving(false)
    }
  }

  const handleBulkApprove = async (status: 'approved' | 'rejected') => {
    if (selectedExpenses.length === 0) {
      toast.error('Please select expenses to approve')
      return
    }

    try {
      setApproving(true)
      const { error } = await supabase
        .from('driver_expenses')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedExpenses)

      if (error) throw error

      toast.success(`${selectedExpenses.length} expenses ${status} successfully`)
      
      // Update local state
      setExpenses(prev => prev.map(expense => 
        selectedExpenses.includes(expense.id)
          ? { ...expense, status }
          : expense
      ))
      
      setSelectedExpenses([])
    } catch (error) {
      console.error('Error bulk updating expenses:', error)
      toast.error(`Failed to ${status} expenses`)
    } finally {
      setApproving(false)
    }
  }

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    if (checked) {
      setSelectedExpenses(prev => [...prev, expenseId])
    } else {
      setSelectedExpenses(prev => prev.filter(id => id !== expenseId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(expenses.map(expense => expense.id))
    } else {
      setSelectedExpenses([])
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      charging: 'bg-red-100 text-red-800',
      maintenance: 'bg-blue-100 text-blue-800',
      food: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-1 sm:px-2 lg:px-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {appUser?.role === 'admin' ? 'All Expenses' : 'Expense History'}
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {appUser?.role === 'admin' 
                ? 'View all driver expenses across the platform' 
                : 'Track your daily expenses over time'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      {appUser?.role === 'admin' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedExpenses.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedExpenses.length} selected
                </span>
                <Button
                  size="sm"
                  onClick={() => handleBulkApprove('approved')}
                  disabled={approving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkApprove('rejected')}
                  disabled={approving}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject All
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">AED {totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {appUser?.role === 'admin' ? 'All time' : 'Last 30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">AED {averageDaily.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days with Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">
              {appUser?.role === 'admin' ? 'All time' : 'Last 30 days'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {appUser?.role === 'admin' ? 'All Expenses Breakdown' : 'Daily Expenses Breakdown'}
          </CardTitle>
          <CardDescription className="text-sm">
            {appUser?.role === 'admin' 
              ? 'Detailed view of all driver expenses by category' 
              : 'Detailed view of your daily expenses by category'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses recorded</h3>
              <p className="text-gray-600">Start logging your daily expenses to see them here.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm">
                      {new Date(expense.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">AED {expense.amount.toFixed(2)}</div>
                    </div>
                  </div>
                  {appUser?.role === 'admin' && (
                    <div className="mb-2">
                      <div className="text-xs text-gray-600">{expense.users?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{expense.users?.email || 'No email'}</div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Type:</span>
                      <Badge className={`text-xs ${getCategoryColor(expense.expense_type || 'other')}`}>
                        {(expense.expense_type || 'other').charAt(0).toUpperCase() + (expense.expense_type || 'other').slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Status:</span>
                      <Badge className={`text-xs ${getStatusColor(expense.status)}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(expense.status)}
                          {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                        </div>
                      </Badge>
                    </div>
                    <div>
                      <span className="text-xs text-gray-600">Description:</span>
                      <div className="text-xs mt-1">{expense.description || 'No description'}</div>
                    </div>
                    {appUser?.role === 'admin' && expense.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveExpense(expense.id, 'approved')}
                          disabled={approving}
                          className="bg-green-600 hover:bg-green-700 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApproveExpense(expense.id, 'rejected')}
                          disabled={approving}
                          className="text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {appUser?.role === 'admin' && (
                      <TableHead className="text-xs w-12">
                        <Checkbox
                          checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                    )}
                    <TableHead className="text-xs">Date</TableHead>
                    {appUser?.role === 'admin' && <TableHead className="text-xs">Driver</TableHead>}
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Amount</TableHead>
                    {appUser?.role === 'admin' && <TableHead className="text-xs">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      {appUser?.role === 'admin' && (
                        <TableCell>
                          <Checkbox
                            checked={selectedExpenses.includes(expense.id)}
                            onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium text-sm">
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      {appUser?.role === 'admin' && (
                        <TableCell className="text-sm">
                          <div className="space-y-1">
                            <div className="font-medium">{expense.users?.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{expense.users?.email || 'No email'}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        <Badge className={`text-xs ${getCategoryColor(expense.expense_type || 'other')}`}>
                          {(expense.expense_type || 'other').charAt(0).toUpperCase() + (expense.expense_type || 'other').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {expense.description || 'No description'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge className={`text-xs ${getStatusColor(expense.status)}`}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(expense.status)}
                            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        AED {expense.amount.toFixed(2)}
                      </TableCell>
                      {appUser?.role === 'admin' && (
                        <TableCell>
                          {expense.status === 'pending' ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleApproveExpense(expense.id, 'approved')}
                                disabled={approving}
                                className="bg-green-600 hover:bg-green-700 h-8 px-2"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproveExpense(expense.id, 'rejected')}
                                disabled={approving}
                                className="h-8 px-2"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {expense.status === 'approved' ? 'Approved' : 'Rejected'}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
          {hasMore && (
            <div className="mt-4 text-center">
              <Button 
                onClick={loadMore} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? 'Loading...' : 'Load More Expenses'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}