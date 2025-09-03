'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import AccountantDashboard from '@/components/dashboard/AccountantDashboard'
import DriverDashboard from '@/components/dashboard/DriverDashboard'

export default function DashboardPage() {
  const { appUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !appUser) {
      router.push('/login')
    }
  }, [appUser, loading, router])

  if (loading || !appUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  switch (appUser.role) {
    case 'admin':
      return <AdminDashboard />
    case 'accountant':
      return <AccountantDashboard />
    case 'driver':
      return <DriverDashboard />
    default:
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this dashboard.</p>
        </div>
      )
  }
}
