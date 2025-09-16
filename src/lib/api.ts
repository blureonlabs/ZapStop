/**
 * API Service for connecting frontend to backend
 * Supports both local development and AWS Lambda deployment
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'driver' | 'accountant' | 'owner'
  phone: string
  assigned_car_id?: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  name: string
  email: string
  phone: string
  password: string
  role: 'admin' | 'driver' | 'accountant' | 'owner'
  assigned_car_id?: string
}

export interface Car {
  id: string
  plate_number: string
  model: string
  monthly_due: number
  assigned_driver_id?: string
  owner_id?: string
  created_at: string
  updated_at: string
}

export interface Owner {
  id: string
  name: string
  email: string
  phone: string
  address?: string
  created_at: string
  updated_at: string
}

export interface DriverEarning {
  id: string
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
  created_at: string
  updated_at: string
}

export interface DriverExpense {
  id: string
  driver_id: string
  date: string
  expense_type: string
  amount: number
  description?: string
  proof_url?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  category?: string
  created_at: string
  updated_at: string
  users?: {
    name: string
    email: string
  }
}

export interface Attendance {
  id: string
  driver_id: string
  date: string
  start_time?: string
  end_time?: string
  status: 'present' | 'absent' | 'late'
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  driver_id: string
  leave_type: 'sick' | 'personal' | 'vacation' | 'emergency' | 'other'
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  approved_by?: string
  created_at: string
  updated_at: string
  users?: {
    name: string
    email: string
  }
}

export interface AnalyticsData {
  summary: {
    total_earnings: number
    total_expenses: number
    net_profit: number
    time_period: string
  }
  platform_breakdown: {
    uber_earnings: number
    bolt_earnings: number
    individual_earnings: number
  }
  company_stats: {
    total_drivers: number
    active_drivers: number
    total_cars: number
    total_owners: number
    total_admins: number
  }
  active_drivers: Array<{
    id: string
    name: string
    email: string
    phone: string
    start_time: string
    date: string
    car_plate: string
    car_model: string
    monthly_due: number
  }>
  daily_trends: Array<{
    date: string
    earnings: number
  }>
  records_count: {
    earnings_records: number
    expenses_records: number
  }
}

class ApiService {
  private token: string | null = null

  constructor() {
    // Check for stored token on initialization
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken) {
        this.token = storedToken
      }
    }
  }

  setToken(token: string) {
    this.token = token
  }

  clearToken() {
    this.token = null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Check for token in localStorage if not set in memory
    if (!this.token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token')
      if (storedToken) {
        this.token = storedToken
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    } else {
      console.warn('No authentication token available for request to:', endpoint)
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401) {
        // Clear token and redirect to login
        this.clearToken()
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          // Redirect to login page
          window.location.href = '/login'
        }
      }
      
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Authentication
  async login(email: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Login failed')
    }

    const data = await response.json()
    this.setToken(data.access_token)
    return data
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/api/auth/me')
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/users/')
  }

  async createUser(userData: CreateUserData): Promise<User> {
    return this.request<User>('/api/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    return this.request<User>(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request<void>(`/api/users/${userId}`, {
      method: 'DELETE',
    })
  }

  // Cars
  async getCars(): Promise<Car[]> {
    const cars = await this.request<Car[]>('/api/cars/')
    console.log('Backend API - Cars data:', cars)
    return cars
  }

  async getMyCar(): Promise<Car> {
    return this.request<Car>('/api/cars/my-car')
  }

  async createCar(carData: Partial<Car>): Promise<Car> {
    return this.request<Car>('/api/cars/', {
      method: 'POST',
      body: JSON.stringify(carData),
    })
  }

  async updateCar(carId: string, carData: Partial<Car>): Promise<Car> {
    return this.request<Car>(`/api/cars/${carId}`, {
      method: 'PUT',
      body: JSON.stringify(carData),
    })
  }

  async deleteCar(carId: string): Promise<void> {
    return this.request<void>(`/api/cars/${carId}`, {
      method: 'DELETE',
    })
  }

  async assignCarToDriver(carId: string, driverId: string): Promise<Car> {
    return this.request<Car>(`/api/cars/${carId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ driver_id: driverId }),
    })
  }

  async assignCarToOwner(carId: string, ownerId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/cars/${carId}/assign-owner`, {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId }),
    })
  }

  async removeCarFromOwner(carId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/cars/${carId}/assign-owner`, {
      method: 'DELETE',
    })
  }

  async unassignCarFromOwner(carId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/cars/${carId}/unassign-owner`, {
      method: 'DELETE',
    })
  }

  // Owners
  async getOwners(): Promise<Owner[]> {
    const owners = await this.request<Owner[]>('/api/owners/')
    console.log('Backend API - Owners data:', owners)
    return owners
  }

  async createOwner(ownerData: Partial<Owner>): Promise<Owner> {
    return this.request<Owner>('/api/owners/', {
      method: 'POST',
      body: JSON.stringify(ownerData),
    })
  }

  async updateOwner(ownerId: string, ownerData: Partial<Owner>): Promise<Owner> {
    return this.request<Owner>(`/api/owners/${ownerId}`, {
      method: 'PUT',
      body: JSON.stringify(ownerData),
    })
  }

  async deleteOwner(ownerId: string): Promise<void> {
    return this.request<void>(`/api/owners/${ownerId}`, {
      method: 'DELETE',
    })
  }

  // Analytics
  async getDashboardData(timeFilter: string = 'monthly'): Promise<AnalyticsData> {
    return this.request<AnalyticsData>(`/api/analytics/dashboard?time_filter=${timeFilter}`)
  }

  async getEarningsAnalytics(timeFilter: string = 'monthly') {
    return this.request(`/api/analytics/earnings?time_filter=${timeFilter}`)
  }

  // Earnings
  async getEarnings(driverId?: string, skip: number = 0, limit: number = 100): Promise<DriverEarning[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })
    if (driverId) params.append('driver_id', driverId)
    
    return this.request<DriverEarning[]>(`/api/earnings/?${params}`)
  }

  async createEarning(earningData: Partial<DriverEarning>): Promise<DriverEarning> {
    return this.request<DriverEarning>('/api/earnings/', {
      method: 'POST',
      body: JSON.stringify(earningData),
    })
  }

  async updateEarning(earningId: string, earningData: Partial<DriverEarning>): Promise<DriverEarning> {
    return this.request<DriverEarning>(`/api/earnings/${earningId}`, {
      method: 'PUT',
      body: JSON.stringify(earningData),
    })
  }

  async deleteEarning(earningId: string): Promise<void> {
    return this.request<void>(`/api/earnings/${earningId}`, {
      method: 'DELETE',
    })
  }

  // Expenses
  async getExpenses(driverId?: string, status?: string, skip: number = 0, limit: number = 100): Promise<DriverExpense[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })
    if (driverId) params.append('driver_id', driverId)
    if (status) params.append('status', status)
    
    return this.request<DriverExpense[]>(`/api/expenses/?${params}`)
  }

  async createExpense(expenseData: Partial<DriverExpense>): Promise<DriverExpense> {
    return this.request<DriverExpense>('/api/expenses/', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    })
  }

  async updateExpense(expenseId: string, expenseData: Partial<DriverExpense>): Promise<DriverExpense> {
    return this.request<DriverExpense>(`/api/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    })
  }

  async approveExpense(expenseId: string): Promise<DriverExpense> {
    return this.request<DriverExpense>(`/api/expenses/${expenseId}/approve`, {
      method: 'PUT',
    })
  }

  async rejectExpense(expenseId: string, adminNotes?: string): Promise<DriverExpense> {
    return this.request<DriverExpense>(`/api/expenses/${expenseId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ admin_notes: adminNotes }),
    })
  }

  async deleteExpense(expenseId: string): Promise<void> {
    return this.request<void>(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
    })
  }

  // Attendance
  async getAttendance(driverId?: string, skip: number = 0, limit: number = 100): Promise<Attendance[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })
    if (driverId) params.append('driver_id', driverId)
    
    return this.request<Attendance[]>(`/api/attendance/?${params}`)
  }

  async createAttendance(attendanceData: Partial<Attendance>): Promise<Attendance> {
    return this.request<Attendance>('/api/attendance/', {
      method: 'POST',
      body: JSON.stringify(attendanceData),
    })
  }

  async startWork(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/attendance/start-work', {
      method: 'POST',
    })
  }

  async endWork(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/attendance/end-work', {
      method: 'POST',
    })
  }

  async getCurrentStatus(): Promise<{ status: string; start_time?: string }> {
    return this.request<{ status: string; start_time?: string }>('/api/attendance/current-status')
  }

  // Leave Requests
  async getLeaveRequests(driverId?: string, status?: string, skip: number = 0, limit: number = 100): Promise<LeaveRequest[]> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })
    if (driverId) params.append('driver_id', driverId)
    if (status) params.append('status', status)
    
    return this.request<LeaveRequest[]>(`/api/leave-requests/?${params}`)
  }

  async createLeaveRequest(leaveRequestData: Partial<LeaveRequest>): Promise<LeaveRequest> {
    return this.request<LeaveRequest>('/api/leave-requests/', {
      method: 'POST',
      body: JSON.stringify(leaveRequestData),
    })
  }

  async updateLeaveRequest(leaveRequestId: string, leaveRequestData: Partial<LeaveRequest>): Promise<LeaveRequest> {
    return this.request<LeaveRequest>(`/api/leave-requests/${leaveRequestId}`, {
      method: 'PUT',
      body: JSON.stringify(leaveRequestData),
    })
  }

  async approveLeaveRequest(leaveRequestId: string, adminNotes?: string): Promise<LeaveRequest> {
    return this.request<LeaveRequest>(`/api/leave-requests/${leaveRequestId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ admin_notes: adminNotes }),
    })
  }

  async rejectLeaveRequest(leaveRequestId: string, adminNotes?: string): Promise<LeaveRequest> {
    return this.request<LeaveRequest>(`/api/leave-requests/${leaveRequestId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ admin_notes: adminNotes }),
    })
  }

  async deleteLeaveRequest(leaveRequestId: string): Promise<void> {
    return this.request<void>(`/api/leave-requests/${leaveRequestId}`, {
      method: 'DELETE',
    })
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health/')
  }
}

export const apiService = new ApiService()
export default apiService
