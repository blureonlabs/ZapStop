import { supabase } from './supabase'

// Edge Functions API client
export class EdgeFunctionsAPI {
  private supabaseUrl: string
  private supabaseAnonKey: string

  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    this.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }

  // Analytics Functions
  async calculateDashboardStats(timeFilter: string = 'monthly') {
    const { data, error } = await supabase.functions.invoke('calculate-dashboard-stats', {
      body: { timeFilter }
    })

    if (error) {
      throw new Error(`Dashboard stats error: ${error.message}`)
    }

    // Handle the response format from Edge Function
    if (data.success && data.data) {
      return data.data
    } else {
      throw new Error(data.error || 'Failed to fetch dashboard data')
    }
  }

  // User Management Functions
  async createDriver(userData: {
    name: string
    email: string
    password: string
    phone?: string
    role?: 'admin' | 'accountant' | 'driver'
    assigned_car_id?: string
  }) {
    const { data, error } = await supabase.functions.invoke('create-driver', {
      body: userData
    })

    if (error) {
      throw new Error(`Create driver error: ${error.message}`)
    }

    return data
  }

  // Real-time Functions
  async processAttendance(action: 'start' | 'end' | 'check_status', driver_id: string, date?: string) {
    const { data, error } = await supabase.functions.invoke('process-attendance', {
      body: { action, driver_id, date }
    })

    if (error) {
      throw new Error(`Attendance error: ${error.message}`)
    }

    return data
  }

  // Data Processing Functions
  async exportFinancialData(options: {
    type: 'earnings' | 'expenses' | 'attendance' | 'all'
    format: 'csv' | 'json'
    dateFrom: string
    dateTo: string
    driverId?: string
  }) {
    const { data, error } = await supabase.functions.invoke('export-financial-data', {
      body: options
    })

    if (error) {
      throw new Error(`Export error: ${error.message}`)
    }

    return data
  }

  // Webhook Functions
  async sendEmailNotification(notification: {
    to: string | string[]
    subject: string
    template: 'expense_approval' | 'expense_rejection' | 'leave_approval' | 'leave_rejection' | 'daily_summary' | 'custom'
    data?: Record<string, unknown>
    html?: string
    text?: string
  }) {
    const { data, error } = await supabase.functions.invoke('email-notifications', {
      body: notification
    })

    if (error) {
      throw new Error(`Email notification error: ${error.message}`)
    }

    return data
  }

  // CRUD Operations
  async manageOwners(action: string, ownerData?: Record<string, unknown>, ownerId?: string, carAssignments?: Record<string, unknown>[], filters?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('manage-owners', {
      body: { action, ownerData, ownerId, carAssignments, filters }
    })

    if (error) {
      throw new Error(`Owners management error: ${error.message}`)
    }

    return data
  }

  async manageCars(action: string, carData?: Record<string, unknown>, carId?: string, driverId?: string, ownerId?: string, filters?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('manage-cars', {
      body: { action, carData, carId, driverId, ownerId, filters }
    })

    if (error) {
      throw new Error(`Cars management error: ${error.message}`)
    }

    return data
  }

  async manageLeaveRequests(action: string, leaveData?: Record<string, unknown>, leaveId?: string, approverId?: string, rejectionReason?: string, filters?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('manage-leave-requests', {
      body: { action, leaveData, leaveId, approverId, rejectionReason, filters }
    })

    if (error) {
      throw new Error(`Leave requests management error: ${error.message}`)
    }

    return data
  }

  async manageEarnings(action: string, earningData?: Record<string, unknown>, earningId?: string, earningsData?: Record<string, unknown>[], filters?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('manage-earnings', {
      body: { action, earningData, earningId, earningsData, filters }
    })

    if (error) {
      throw new Error(`Earnings management error: ${error.message}`)
    }

    return data
  }

  async manageExpenses(action: string, expenseData?: Record<string, unknown>, expenseId?: string, expensesData?: Record<string, unknown>[], approverId?: string, rejectionReason?: string, filters?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('manage-expenses', {
      body: { action, expenseData, expenseId, expensesData, approverId, rejectionReason, filters }
    })

    if (error) {
      throw new Error(`Expenses management error: ${error.message}`)
    }

    return data
  }
}

// Export singleton instance
export const edgeFunctions = new EdgeFunctionsAPI()

// Helper functions for common operations
export const dashboardAPI = {
  async getStats(timeFilter: string = 'monthly') {
    const result = await edgeFunctions.calculateDashboardStats(timeFilter)
    return result.data
  }
}

export const exportAPI = {
  async exportFinancialData(payload: { type: 'earnings' | 'expenses'; startDate: string; endDate: string }) {
    const result = await edgeFunctions.exportFinancialData(payload)
    return result
  }
}

// CRUD Operations API
export const ownersAPI = {
  async create(ownerData: Record<string, unknown>) {
    return await edgeFunctions.manageOwners('create', ownerData)
  },
  async update(ownerId: string, ownerData: Record<string, unknown>) {
    return await edgeFunctions.manageOwners('update', ownerData, ownerId)
  },
  async delete(ownerId: string) {
    return await edgeFunctions.manageOwners('delete', undefined, ownerId)
  },
  async get(ownerId: string) {
    return await edgeFunctions.manageOwners('get', undefined, ownerId)
  },
  async list(filters?: Record<string, unknown>) {
    return await edgeFunctions.manageOwners('list', undefined, undefined, undefined, filters)
  }
}

export const carsAPI = {
  async create(carData: Record<string, unknown>) {
    return await edgeFunctions.manageCars('create', carData)
  },
  async update(carId: string, carData: Record<string, unknown>) {
    return await edgeFunctions.manageCars('update', carData, carId)
  },
  async delete(carId: string) {
    return await edgeFunctions.manageCars('delete', undefined, carId)
  },
  async get(carId: string) {
    return await edgeFunctions.manageCars('get', undefined, carId)
  },
  async list(filters?: Record<string, unknown>) {
    return await edgeFunctions.manageCars('list', undefined, undefined, undefined, undefined, filters)
  },
  async assignDriver(carId: string, driverId: string) {
    return await edgeFunctions.manageCars('assign_driver', undefined, carId, driverId)
  },
  async unassignDriver(carId: string) {
    return await edgeFunctions.manageCars('unassign_driver', undefined, carId)
  }
}

export const leaveRequestsAPI = {
  async create(leaveData: Record<string, unknown>) {
    return await edgeFunctions.manageLeaveRequests('create', leaveData)
  },
  async update(leaveId: string, leaveData: Record<string, unknown>) {
    return await edgeFunctions.manageLeaveRequests('update', leaveData, leaveId)
  },
  async delete(leaveId: string) {
    return await edgeFunctions.manageLeaveRequests('delete', undefined, leaveId)
  },
  async get(leaveId: string) {
    return await edgeFunctions.manageLeaveRequests('get', undefined, leaveId)
  },
  async list(filters?: Record<string, unknown>) {
    return await edgeFunctions.manageLeaveRequests('list', undefined, undefined, undefined, undefined, filters)
  },
  async approve(leaveId: string, approverId: string) {
    return await edgeFunctions.manageLeaveRequests('approve', undefined, leaveId, approverId)
  },
  async reject(leaveId: string, approverId: string, rejectionReason?: string) {
    return await edgeFunctions.manageLeaveRequests('reject', undefined, leaveId, approverId, rejectionReason)
  }
}

export const earningsAPI = {
  async create(earningData: Record<string, unknown>) {
    return await edgeFunctions.manageEarnings('create', earningData)
  },
  async bulkCreate(earningsData: Record<string, unknown>[]) {
    return await edgeFunctions.manageEarnings('bulk_create', undefined, undefined, earningsData)
  },
  async update(earningId: string, earningData: Record<string, unknown>) {
    return await edgeFunctions.manageEarnings('update', earningData, earningId)
  },
  async delete(earningId: string) {
    return await edgeFunctions.manageEarnings('delete', undefined, earningId)
  },
  async get(earningId: string) {
    return await edgeFunctions.manageEarnings('get', undefined, earningId)
  },
  async list(filters?: Record<string, unknown>) {
    return await edgeFunctions.manageEarnings('list', undefined, undefined, undefined, filters)
  }
}

export const expensesAPI = {
  async create(expenseData: Record<string, unknown>) {
    return await edgeFunctions.manageExpenses('create', expenseData)
  },
  async bulkCreate(expensesData: Record<string, unknown>[]) {
    return await edgeFunctions.manageExpenses('bulk_create', undefined, undefined, expensesData)
  },
  async update(expenseId: string, expenseData: Record<string, unknown>) {
    return await edgeFunctions.manageExpenses('update', expenseData, expenseId)
  },
  async delete(expenseId: string) {
    return await edgeFunctions.manageExpenses('delete', undefined, expenseId)
  },
  async get(expenseId: string) {
    return await edgeFunctions.manageExpenses('get', undefined, expenseId)
  },
  async list(filters?: Record<string, unknown>) {
    return await edgeFunctions.manageExpenses('list', undefined, undefined, undefined, undefined, filters)
  },
  async approve(expenseId: string, approverId: string) {
    return await edgeFunctions.manageExpenses('approve', undefined, expenseId, approverId)
  },
  async reject(expenseId: string, approverId: string, rejectionReason?: string) {
    return await edgeFunctions.manageExpenses('reject', undefined, expenseId, approverId, rejectionReason)
  }
}

export const userAPI = {
  async createDriver(userData: Parameters<typeof edgeFunctions.createDriver>[0]) {
    const result = await edgeFunctions.createDriver(userData)
    return result.user
  }
}

export const attendanceAPI = {
  async startWork(driver_id: string, date?: string) {
    const result = await edgeFunctions.processAttendance('start', driver_id, date)
    return result.data
  },

  async endWork(driver_id: string, date?: string) {
    const result = await edgeFunctions.processAttendance('end', driver_id, date)
    return result.data
  },

  async getStatus(driver_id: string, date?: string) {
    const result = await edgeFunctions.processAttendance('check_status', driver_id, date)
    return result.data
  }
}


export const notificationAPI = {
  async sendExpenseApproval(to: string, data: any) {
    const result = await edgeFunctions.sendEmailNotification({
      to,
      subject: 'Expense Approved',
      template: 'expense_approval',
      data
    })
    return result
  },

  async sendExpenseRejection(to: string, data: any) {
    const result = await edgeFunctions.sendEmailNotification({
      to,
      subject: 'Expense Rejected',
      template: 'expense_rejection',
      data
    })
    return result
  },

  async sendLeaveApproval(to: string, data: any) {
    const result = await edgeFunctions.sendEmailNotification({
      to,
      subject: 'Leave Request Approved',
      template: 'leave_approval',
      data
    })
    return result
  },

  async sendLeaveRejection(to: string, data: any) {
    const result = await edgeFunctions.sendEmailNotification({
      to,
      subject: 'Leave Request Rejected',
      template: 'leave_rejection',
      data
    })
    return result
  },

  async sendDailySummary(to: string, data: any) {
    const result = await edgeFunctions.sendEmailNotification({
      to,
      subject: `Daily Summary - ${data.date || new Date().toLocaleDateString()}`,
      template: 'daily_summary',
      data
    })
    return result
  }
}
