// CSV Parser utility for earnings and expenses
export interface EarningsCSVRow {
  driver_name: string
  driver_email: string
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

export interface ExpensesCSVRow {
  driver_name: string
  driver_email: string
  date: string
  expense_type: string
  amount: number
  description: string
  proof_url?: string
  status: string
}

export interface ParsedCSVData {
  earnings: EarningsCSVRow[]
  expenses: ExpensesCSVRow[]
  errors: string[]
}

export function parseCSV(csvContent: string): ParsedCSVData {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    return { earnings: [], expenses: [], errors: ['CSV must have at least a header row and one data row'] }
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  const dataRows = lines.slice(1)
  
  const earnings: EarningsCSVRow[] = []
  const expenses: ExpensesCSVRow[] = []
  const errors: string[] = []

  // Determine if this is earnings or expenses CSV based on headers
  const isEarningsCSV = headers.some(h => h.includes('uber') || h.includes('bolt') || h.includes('individual'))
  const isExpensesCSV = headers.some(h => h.includes('expense') || h.includes('amount') || h.includes('type'))

  dataRows.forEach((row, index) => {
    const values = row.split(',').map(v => v.trim())
    
    if (values.length !== headers.length) {
      errors.push(`Row ${index + 2}: Column count mismatch. Expected ${headers.length}, got ${values.length}`)
      return
    }

    try {
      if (isEarningsCSV) {
        const earningRow = parseEarningsRow(headers, values, index + 2)
        if (earningRow) {
          earnings.push(earningRow)
        }
      } else if (isExpensesCSV) {
        const expenseRow = parseExpensesRow(headers, values, index + 2)
        if (expenseRow) {
          expenses.push(expenseRow)
        }
      } else {
        errors.push(`Row ${index + 2}: Cannot determine if this is earnings or expenses data`)
      }
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  return { earnings, expenses, errors }
}

function parseEarningsRow(headers: string[], values: string[], rowNumber: number): EarningsCSVRow | null {
  const row: any = {}
  
  headers.forEach((header, index) => {
    const value = values[index]
    
    switch (header) {
      case 'driver_name':
      case 'driver':
      case 'name':
        row.driver_name = value
        break
      case 'driver_email':
      case 'email':
        row.driver_email = value
        break
      case 'date':
        row.date = value
        break
      case 'uber_cash':
        row.uber_cash = parseFloat(value) || 0
        break
      case 'uber_account':
        row.uber_account = parseFloat(value) || 0
        break
      case 'bolt_cash':
        row.bolt_cash = parseFloat(value) || 0
        break
      case 'bolt_account':
        row.bolt_account = parseFloat(value) || 0
        break
      case 'uber_rides_count':
      case 'uber_rides':
        row.uber_rides_count = parseInt(value) || 0
        break
      case 'bolt_rides_count':
      case 'bolt_rides':
        row.bolt_rides_count = parseInt(value) || 0
        break
      case 'individual_rides_count':
      case 'individual_rides':
        row.individual_rides_count = parseInt(value) || 0
        break
      case 'individual_rides_cash':
      case 'individual_cash':
        row.individual_rides_cash = parseFloat(value) || 0
        break
      case 'individual_rides_account':
      case 'individual_account':
        row.individual_rides_account = parseFloat(value) || 0
        break
      case 'notes':
      case 'note':
        row.notes = value
        break
    }
  })

  // Validate required fields
  if (!row.driver_name && !row.driver_email) {
    throw new Error('Driver name or email is required')
  }
  
  if (!row.date) {
    throw new Error('Date is required')
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(row.date)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  return {
    driver_name: row.driver_name || '',
    driver_email: row.driver_email || '',
    date: row.date,
    uber_cash: row.uber_cash || 0,
    uber_account: row.uber_account || 0,
    bolt_cash: row.bolt_cash || 0,
    bolt_account: row.bolt_account || 0,
    uber_rides_count: row.uber_rides_count || 0,
    bolt_rides_count: row.bolt_rides_count || 0,
    individual_rides_count: row.individual_rides_count || 0,
    individual_rides_cash: row.individual_rides_cash || 0,
    individual_rides_account: row.individual_rides_account || 0,
    notes: row.notes || ''
  }
}

function parseExpensesRow(headers: string[], values: string[], rowNumber: number): ExpensesCSVRow | null {
  const row: any = {}
  
  headers.forEach((header, index) => {
    const value = values[index]
    
    switch (header) {
      case 'driver_name':
      case 'driver':
      case 'name':
        row.driver_name = value
        break
      case 'driver_email':
      case 'email':
        row.driver_email = value
        break
      case 'date':
        row.date = value
        break
      case 'expense_type':
      case 'type':
        row.expense_type = value.toLowerCase()
        break
      case 'amount':
        row.amount = parseFloat(value) || 0
        break
      case 'description':
      case 'desc':
        row.description = value
        break
      case 'proof_url':
      case 'proof':
      case 'url':
        row.proof_url = value
        break
      case 'status':
        row.status = value.toLowerCase()
        break
    }
  })

  // Validate required fields
  if (!row.driver_name && !row.driver_email) {
    throw new Error('Driver name or email is required')
  }
  
  if (!row.date) {
    throw new Error('Date is required')
  }

  if (!row.expense_type) {
    throw new Error('Expense type is required')
  }

  if (!row.amount || row.amount <= 0) {
    throw new Error('Amount must be greater than 0')
  }

  if (!row.description) {
    throw new Error('Description is required')
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(row.date)) {
    throw new Error('Date must be in YYYY-MM-DD format')
  }

  // Validate expense type
  const validExpenseTypes = ['fuel', 'maintenance', 'insurance', 'toll', 'parking', 'other']
  if (!validExpenseTypes.includes(row.expense_type)) {
    throw new Error(`Invalid expense type. Must be one of: ${validExpenseTypes.join(', ')}`)
  }

  // Validate status
  const validStatuses = ['pending', 'approved', 'rejected']
  if (row.status && !validStatuses.includes(row.status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  return {
    driver_name: row.driver_name || '',
    driver_email: row.driver_email || '',
    date: row.date,
    expense_type: row.expense_type,
    amount: row.amount,
    description: row.description,
    proof_url: row.proof_url || '',
    status: row.status || 'pending'
  }
}

export function generateCSVTemplate(type: 'earnings' | 'expenses'): string {
  if (type === 'earnings') {
    return `driver_name,driver_email,date,uber_cash,uber_account,bolt_cash,bolt_account,uber_rides_count,bolt_rides_count,individual_rides_count,individual_rides_cash,individual_rides_account,notes
John Doe,john@example.com,2024-01-15,150.00,200.00,120.00,180.00,8,12,5,100.00,50.00,Good day`
  } else {
    return `driver_name,driver_email,date,expense_type,amount,description,proof_url,status
John Doe,john@example.com,2024-01-15,fuel,45.50,Fuel for the day,,pending`
  }
}
