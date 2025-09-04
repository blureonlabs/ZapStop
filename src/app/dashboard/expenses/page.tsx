'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Receipt, ArrowLeft, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface DriverExpense {
  id: string
  driver_id: string
  date: string
  amount: number
  description: string
  category: string
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
  const itemsPerPage = 50

  useEffect(() => {
    if (appUser) {
      fetchExpenses(1, true)
    }
  }, [appUser])

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
          users!inner(name, email)
        `)
        .order('date', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1)

      // If user is admin, show all expenses. Otherwise, show only their own
      if (appUser?.role !== 'admin') {
        query = query.eq('driver_id', authUserId)
      }

      const { data: expensesData, error: expensesError } = await query

      if (expensesError) {
        console.error('Error fetching expenses:', expensesError)
        toast.error('Failed to load expenses data')
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

  const getCategoryColor = (category: string) => {
    const colors = {
      fuel: 'bg-red-100 text-red-800',
      maintenance: 'bg-blue-100 text-blue-800',
      food: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[category as keyof typeof colors] || colors.other
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {appUser?.role === 'admin' ? 'All Expenses' : 'Expense History'}
            </h1>
            <p className="text-gray-600">
              {appUser?.role === 'admin' 
                ? 'View all driver expenses across the platform' 
                : 'Track your daily expenses over time'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {totalExpenses.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">AED {averageDaily.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">
              {appUser?.role === 'admin' ? 'All time' : 'Last 30 days'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {appUser?.role === 'admin' ? 'All Expenses Breakdown' : 'Daily Expenses Breakdown'}
          </CardTitle>
          <CardDescription>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    {appUser?.role === 'admin' && <TableHead>Driver</TableHead>}
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      {appUser?.role === 'admin' && (
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{expense.users?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{expense.users?.email || 'No email'}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge className={getCategoryColor(expense.category || 'other')}>
                          {(expense.category || 'other').charAt(0).toUpperCase() + (expense.category || 'other').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {expense.description || 'No description'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        AED {expense.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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