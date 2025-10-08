'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminDashboardOptimized from '@/components/dashboard/AdminDashboardOptimized'
import AccountantDashboard from '@/components/dashboard/AccountantDashboard'
import DriverDashboard from '@/components/dashboard/DriverDashboard'
import OwnerDashboard from '@/components/dashboard/OwnerDashboard'

export default function DashboardPage() {
  const { appUser, loading } = useAuth()
  const router = useRouter()

  // Debug logging
  console.log('Dashboard render - loading:', loading, 'appUser:', appUser?.id, appUser?.role)

  useEffect(() => {
    if (!loading && !appUser) {
      console.log('No appUser found, redirecting to login')
      router.push('/login')
    }
  }, [appUser, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!appUser) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
        <p className="text-gray-600 mb-4">Your user account was not found in the database.</p>
        <p className="text-sm text-gray-500">Please contact your administrator to set up your account.</p>
      </div>
    )
  }

  switch (appUser.role) {
    case 'admin':
      return <AdminDashboardOptimized />
    case 'accountant':
      return <AccountantDashboard />
    case 'driver':
      return <DriverDashboard />
    case 'owner':
      return <OwnerDashboard />
    default:
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this dashboard.</p>
        </div>
      )
  }
}
