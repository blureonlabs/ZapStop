'use client'

import { useState, useEffect } from 'react'
import { supabase, User, DriverExpense } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Receipt, Check, X } from 'lucide-react'
import { toast } from 'sonner'

export default function ExpensesPage() {
  const [drivers, setDrivers] = useState<User[]>([])
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    driver_id: '',
    date: new Date().toISOString().split('T')[0],
    expense_type: '',
    amount: '',
    proof_url: '',
    status: 'pending' as const
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch all expenses with driver info
      const { data: expensesData } = await supabase
        .from('driver_expenses')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('created_at', { ascending: false })

      setDrivers(usersData?.filter(u => u.role === 'driver') || [])
      setExpenses(expensesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExpense = async () => {
    try {
      const { error } = await supabase
        .from('driver_expenses')
        .insert([{
          driver_id: expenseForm.driver_id,
          date: expenseForm.date,
          expense_type: expenseForm.expense_type,
          amount: Number(expenseForm.amount),
          proof_url: expenseForm.proof_url || null,
          status: expenseForm.status
        }])

      if (error) throw error

      toast.success('Expense created successfully')
      setShowExpenseDialog(false)
      setExpenseForm({
        driver_id: '',
        date: new Date().toISOString().split('T')[0],
        expense_type: '',
        amount: '',
        proof_url: '',
        status: 'pending'
      })
      fetchData()
    } catch (error: any) {
      console.error('Error creating expense:', error)
      toast.error(error.message || 'Failed to create expense')
    }
  }

  const handleUpdateExpenseStatus = async (expenseId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('driver_expenses')
        .update({ status: newStatus })
        .eq('id', expenseId)

      if (error) throw error

      toast.success(`Expense ${newStatus} successfully`)
      fetchData()
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense')
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const { error } = await supabase
        .from('driver_expenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      toast.success('Expense deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Failed to delete expense')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredExpenses = filterStatus === 'all' 
    ? expenses 
    : expenses.filter(expense => expense.status === filterStatus)

  const getExpenseStats = () => {
    const totalExpenses = expenses.length
    const pendingExpenses = expenses.filter(e => e.status === 'pending').length
    const approvedExpenses = expenses.filter(e => e.status === 'approved').length
    const totalAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)

    return { totalExpenses, pendingExpenses, approvedExpenses, totalAmount }
  }

  const stats = getExpenseStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Receipt className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Expense Management</h1>
        </div>
        <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record a new expense for a driver
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="driver">Driver</Label>
                <Select value={expenseForm.driver_id} onValueChange={(value) => setExpenseForm({...expenseForm, driver_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="expense_type">Expense Type</Label>
                <Input
                  id="expense_type"
                  value={expenseForm.expense_type}
                  onChange={(e) => setExpenseForm({...expenseForm, expense_type: e.target.value})}
                  placeholder="e.g., Fuel, Maintenance, Toll"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (AED)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="proof_url">Proof URL (Optional)</Label>
                <Input
                  id="proof_url"
                  value={expenseForm.proof_url}
                  onChange={(e) => setExpenseForm({...expenseForm, proof_url: e.target.value})}
                  placeholder="Receipt or proof link"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={expenseForm.status} onValueChange={(value: 'pending' | 'approved' | 'rejected') => setExpenseForm({...expenseForm, status: value})}>
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
              <Button onClick={handleCreateExpense} className="w-full">
                Create Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExpenses}</div>
            <p className="text-xs text-muted-foreground">
              All expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedExpenses}</div>
            <p className="text-xs text-muted-foreground">
              Approved expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Approved expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">All Expenses</h2>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expenses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(expense as { users?: { name?: string } }).users?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.expense_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        AED {expense.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.proof_url ? (
                          <a 
                            href={expense.proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View Proof
                          </a>
                        ) : (
                          'No proof'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {expense.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateExpenseStatus(expense.id, 'approved')}
                                className="text-green-600 hover:text-green-800"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUpdateExpenseStatus(expense.id, 'rejected')}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
