'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import OwnerDashboard from '@/components/dashboard/OwnerDashboard'
import { toast } from 'sonner'

export default function OwnerPage() {
  const { appUser, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check if user has permission to access this page
    if (!authLoading && appUser) {
      if (appUser.role !== 'owner') {
        toast.error('Access denied. Owner privileges required.')
        router.push('/dashboard')
        return
      }
    }
  }, [appUser, authLoading, router])

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show access denied if not owner
  if (appUser && appUser.role !== 'owner') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">You don't have permission to access the owner dashboard.</p>
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  return <OwnerDashboard />
}
