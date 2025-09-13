import { useState, useEffect, useCallback } from 'react'
import { apiService, User, Car, Owner, DriverEarning, DriverExpense, LeaveRequest } from '@/lib/api'

// Generic hook for API calls
export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiCall()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Specific hooks for different API endpoints
export function useUsers() {
  return useApi(() => apiService.getUsers())
}

export function useCars() {
  return useApi(() => apiService.getCars())
}

export function useOwners() {
  return useApi(() => apiService.getOwners())
}

export function useDashboardData(timeFilter: string = 'monthly') {
  return useApi(() => apiService.getDashboardData(timeFilter), [timeFilter])
}

export function useEarnings(driverId?: string, skip: number = 0, limit: number = 100) {
  return useApi(() => apiService.getEarnings(driverId, skip, limit), [driverId, skip, limit])
}

export function useExpenses(driverId?: string, status?: string, skip: number = 0, limit: number = 100) {
  return useApi(() => apiService.getExpenses(driverId, status, skip, limit), [driverId, status, skip, limit])
}

export function useAttendance(driverId?: string, skip: number = 0, limit: number = 100) {
  return useApi(() => apiService.getAttendance(driverId, skip, limit), [driverId, skip, limit])
}

export function useLeaveRequests(driverId?: string, status?: string, skip: number = 0, limit: number = 100) {
  return useApi(() => apiService.getLeaveRequests(driverId, status, skip, limit), [driverId, status, skip, limit])
}

// Hook for mutations (create, update, delete operations)
export function useMutation<T, P = unknown>(
  mutationFn: (params: P) => Promise<T>
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (params: P) => {
    try {
      setLoading(true)
      setError(null)
      const result = await mutationFn(params)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [mutationFn])

  return { mutate, loading, error }
}

// Specific mutation hooks
export function useCreateUser() {
  return useMutation(apiService.createUser)
}

export function useUpdateUser() {
  return useMutation(({ userId, userData }: { userId: string; userData: Partial<User> }) => 
    apiService.updateUser(userId, userData)
  )
}

export function useDeleteUser() {
  return useMutation(apiService.deleteUser)
}

export function useCreateCar() {
  return useMutation(apiService.createCar)
}

export function useUpdateCar() {
  return useMutation(({ carId, carData }: { carId: string; carData: Partial<Car> }) => 
    apiService.updateCar(carId, carData)
  )
}

export function useDeleteCar() {
  return useMutation(apiService.deleteCar)
}

export function useCreateOwner() {
  return useMutation(apiService.createOwner)
}

export function useUpdateOwner() {
  return useMutation(({ ownerId, ownerData }: { ownerId: string; ownerData: Partial<Owner> }) => 
    apiService.updateOwner(ownerId, ownerData)
  )
}

export function useDeleteOwner() {
  return useMutation(apiService.deleteOwner)
}

export function useCreateEarning() {
  return useMutation(apiService.createEarning)
}

export function useUpdateEarning() {
  return useMutation(({ earningId, earningData }: { earningId: string; earningData: Partial<DriverEarning> }) => 
    apiService.updateEarning(earningId, earningData)
  )
}

export function useDeleteEarning() {
  return useMutation(apiService.deleteEarning)
}

export function useCreateExpense() {
  return useMutation(apiService.createExpense)
}

export function useUpdateExpense() {
  return useMutation(({ expenseId, expenseData }: { expenseId: string; expenseData: Partial<DriverExpense> }) => 
    apiService.updateExpense(expenseId, expenseData)
  )
}

export function useApproveExpense() {
  return useMutation(apiService.approveExpense)
}

export function useRejectExpense() {
  return useMutation(apiService.rejectExpense)
}

export function useDeleteExpense() {
  return useMutation(apiService.deleteExpense)
}

export function useCreateAttendance() {
  return useMutation(apiService.createAttendance)
}

export function useStartWork() {
  return useMutation(apiService.startWork)
}

export function useEndWork() {
  return useMutation(apiService.endWork)
}

export function useCreateLeaveRequest() {
  return useMutation(apiService.createLeaveRequest)
}

export function useUpdateLeaveRequest() {
  return useMutation(({ leaveRequestId, leaveRequestData }: { leaveRequestId: string; leaveRequestData: Partial<LeaveRequest> }) => 
    apiService.updateLeaveRequest(leaveRequestId, leaveRequestData)
  )
}

export function useApproveLeaveRequest() {
  return useMutation(apiService.approveLeaveRequest)
}

export function useRejectLeaveRequest() {
  return useMutation(apiService.rejectLeaveRequest)
}

export function useDeleteLeaveRequest() {
  return useMutation(apiService.deleteLeaveRequest)
}
