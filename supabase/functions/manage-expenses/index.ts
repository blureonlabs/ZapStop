import { serve } from 'https://deno.land/std@0.178.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExpenseData {
  driver_id: string
  date: string
  expense_type: 'fuel' | 'maintenance' | 'insurance' | 'toll' | 'parking' | 'other'
  amount: number
  description: string
  proof_url?: string
  status?: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
}

interface CreateExpenseRequest {
  action: 'create' | 'update' | 'delete' | 'get' | 'list' | 'approve' | 'reject' | 'bulk_create'
  expenseData?: ExpenseData
  expenseId?: string
  expensesData?: ExpenseData[]
  approverId?: string
  rejectionReason?: string
  filters?: {
    driver_id?: string
    status?: string
    expense_type?: string
    start_date?: string
    end_date?: string
    min_amount?: number
    max_amount?: number
    limit?: number
    offset?: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, expenseData, expenseId, expensesData, approverId, rejectionReason, filters }: CreateExpenseRequest = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    switch (action) {
      case 'create': {
        if (!expenseData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense data is required for create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate required fields
        if (!expenseData.driver_id || !expenseData.date || !expenseData.expense_type || !expenseData.amount || !expenseData.description) {
          return new Response(
            JSON.stringify({ success: false, error: 'Driver ID, date, expense type, amount, and description are required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate amount
        if (expenseData.amount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Amount must be greater than 0' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if driver exists
        const { data: driver } = await supabaseClient
          .from('users')
          .select('id, name, role')
          .eq('id', expenseData.driver_id)
          .eq('role', 'driver')
          .single()

        if (!driver) {
          return new Response(
            JSON.stringify({ success: false, error: 'Driver not found or invalid role' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        // Create expense
        const { data: newExpense, error: expenseError } = await supabaseClient
          .from('driver_expenses')
          .insert([{
            driver_id: expenseData.driver_id,
            date: expenseData.date,
            expense_type: expenseData.expense_type,
            amount: expenseData.amount,
            description: expenseData.description,
            proof_url: expenseData.proof_url || null,
            status: expenseData.status || 'pending',
            approved_by: expenseData.approved_by || null,
            approved_at: expenseData.approved_at || null,
            rejection_reason: expenseData.rejection_reason || null,
          }])
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (expenseError) {
          console.error('Error creating expense:', expenseError)
          return new Response(
            JSON.stringify({ success: false, error: expenseError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newExpense,
            message: 'Expense created successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'bulk_create': {
        if (!expensesData || !Array.isArray(expensesData) || expensesData.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expenses data array is required for bulk_create action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Validate all expenses data
        for (const expense of expensesData) {
          if (!expense.driver_id || !expense.date || !expense.expense_type || !expense.amount || !expense.description) {
            return new Response(
              JSON.stringify({ success: false, error: 'All expenses must have driver_id, date, expense_type, amount, and description' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
              }
            )
          }
        }

        // Create all expenses
        const expensesToInsert = expensesData.map(expense => ({
          driver_id: expense.driver_id,
          date: expense.date,
          expense_type: expense.expense_type,
          amount: expense.amount,
          description: expense.description,
          proof_url: expense.proof_url || null,
          status: expense.status || 'pending',
          approved_by: expense.approved_by || null,
          approved_at: expense.approved_at || null,
          rejection_reason: expense.rejection_reason || null,
        }))

        const { data: newExpenses, error: expensesError } = await supabaseClient
          .from('driver_expenses')
          .insert(expensesToInsert)
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)

        if (expensesError) {
          console.error('Error creating expenses:', expensesError)
          return new Response(
            JSON.stringify({ success: false, error: expensesError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: newExpenses,
            message: `${newExpenses.length} expenses created successfully`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'update': {
        if (!expenseId || !expenseData) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense ID and data are required for update action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if expense exists and is pending
        const { data: existingExpense } = await supabaseClient
          .from('driver_expenses')
          .select('id, status')
          .eq('id', expenseId)
          .single()

        if (!existingExpense) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingExpense.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot update processed expense' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Update expense
        const { data: updatedExpense, error: updateError } = await supabaseClient
          .from('driver_expenses')
          .update({
            date: expenseData.date,
            expense_type: expenseData.expense_type,
            amount: expenseData.amount,
            description: expenseData.description,
            proof_url: expenseData.proof_url || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', expenseId)
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (updateError) {
          console.error('Error updating expense:', updateError)
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: updatedExpense,
            message: 'Expense updated successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'approve': {
        if (!expenseId || !approverId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense ID and approver ID are required for approve action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if expense exists and is pending
        const { data: existingExpense } = await supabaseClient
          .from('driver_expenses')
          .select('id, status')
          .eq('id', expenseId)
          .single()

        if (!existingExpense) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingExpense.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense is not pending' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Approve expense
        const { data: approvedExpense, error: approveError } = await supabaseClient
          .from('driver_expenses')
          .update({
            status: 'approved',
            approved_by: approverId,
            approved_at: new Date().toISOString()
          })
          .eq('id', expenseId)
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (approveError) {
          console.error('Error approving expense:', approveError)
          return new Response(
            JSON.stringify({ success: false, error: approveError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: approvedExpense,
            message: 'Expense approved successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'reject': {
        if (!expenseId || !approverId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense ID and approver ID are required for reject action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if expense exists and is pending
        const { data: existingExpense } = await supabaseClient
          .from('driver_expenses')
          .select('id, status')
          .eq('id', expenseId)
          .single()

        if (!existingExpense) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingExpense.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense is not pending' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Reject expense
        const { data: rejectedExpense, error: rejectError } = await supabaseClient
          .from('driver_expenses')
          .update({
            status: 'rejected',
            approved_by: approverId,
            approved_at: new Date().toISOString(),
            rejection_reason: rejectionReason || 'No reason provided'
          })
          .eq('id', expenseId)
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .single()

        if (rejectError) {
          console.error('Error rejecting expense:', rejectError)
          return new Response(
            JSON.stringify({ success: false, error: rejectError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: rejectedExpense,
            message: 'Expense rejected successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'delete': {
        if (!expenseId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense ID is required for delete action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Check if expense exists and is pending
        const { data: existingExpense } = await supabaseClient
          .from('driver_expenses')
          .select('id, status')
          .eq('id', expenseId)
          .single()

        if (!existingExpense) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense not found' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            }
          )
        }

        if (existingExpense.status !== 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot delete processed expense' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Delete expense
        const { error: deleteError } = await supabaseClient
          .from('driver_expenses')
          .delete()
          .eq('id', expenseId)

        if (deleteError) {
          console.error('Error deleting expense:', deleteError)
          return new Response(
            JSON.stringify({ success: false, error: deleteError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Expense deleted successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'get': {
        if (!expenseId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Expense ID is required for get action' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            }
          )
        }

        // Get expense with driver info
        const { data: expense, error: expenseError } = await supabaseClient
          .from('driver_expenses')
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .eq('id', expenseId)
          .single()

        if (expenseError) {
          if (expenseError.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: 'Expense not found' }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
              }
            )
          }
          console.error('Error fetching expense:', expenseError)
          return new Response(
            JSON.stringify({ success: false, error: expenseError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: expense
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      case 'list': {
        // Get all expenses with driver info
        let query = supabaseClient
          .from('driver_expenses')
          .select(`
            *,
            users!driver_expenses_driver_id_fkey (
              id,
              name,
              email
            )
          `)
          .order('created_at', { ascending: false })

        // Apply filters
        if (filters?.driver_id) {
          query = query.eq('driver_id', filters.driver_id)
        }

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        if (filters?.expense_type) {
          query = query.eq('expense_type', filters.expense_type)
        }

        if (filters?.start_date) {
          query = query.gte('date', filters.start_date)
        }

        if (filters?.end_date) {
          query = query.lte('date', filters.end_date)
        }

        if (filters?.min_amount) {
          query = query.gte('amount', filters.min_amount)
        }

        if (filters?.max_amount) {
          query = query.lte('amount', filters.max_amount)
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        if (filters?.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }

        const { data: expenses, error: expensesError } = await query

        if (expensesError) {
          console.error('Error fetching expenses:', expensesError)
          return new Response(
            JSON.stringify({ success: false, error: expensesError.message }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: expenses || []
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        )
    }
  } catch (error) {
    console.error('Error in manage-expenses Edge Function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
