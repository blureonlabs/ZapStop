'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import ManualUpdatePanel from '@/components/dashboard/ManualUpdatePanel'

export default function ManualUpdatePage() {
  const { appUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !appUser) {
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

  // Check if user has permission to access this page
  if (appUser.role !== 'admin' && appUser.role !== 'accountant') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the Manual Update panel.</p>
        <p className="text-sm text-gray-500 mt-2">Only admins and accountants can manage earnings and expenses manually.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <ManualUpdatePanel />
    </div>
  )
}
