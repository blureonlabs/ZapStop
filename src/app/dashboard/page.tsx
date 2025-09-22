'use client'

import { useBackendAuth } from '@/contexts/BackendAuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminDashboardOptimized from '@/components/dashboard/AdminDashboardOptimized'
import AccountantDashboard from '@/components/dashboard/AccountantDashboard'
import DriverDashboard from '@/components/dashboard/DriverDashboard'

export default function DashboardPage() {
  const { user, loading } = useBackendAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
        <p className="text-gray-600 mb-4">Your user account was not found in the database.</p>
        <p className="text-sm text-gray-500">Please contact your administrator to set up your account.</p>
      </div>
    )
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboardOptimized />
    case 'accountant':
      return <AccountantDashboard />
    case 'driver':
      return <BackendDriverDashboard />
    default:
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this dashboard.</p>
        </div>
      )
  }
}
