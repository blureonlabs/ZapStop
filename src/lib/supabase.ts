import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (only if service key is available)
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null

// Database types
export interface User {
  id: string
  name: string
  role: 'admin' | 'accountant' | 'driver'
  email: string
  phone: string
  assigned_car_id?: string
  documents?: Record<string, unknown>
  document_expiry_date?: string
  created_at: string
  updated_at: string
}

export interface Car {
  id: string
  plate_number: string
  model: string
  monthly_due: number
  assigned_driver_id?: string
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
  individual_cash: number
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
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  driver_id: string
  date: string
  start_time?: string
  end_time?: string
  status: 'present' | 'absent' | 'leave'
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
