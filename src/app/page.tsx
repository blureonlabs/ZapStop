'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBackendAuth } from '@/contexts/BackendAuthContext'

// Optimized loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading Zap Stop...</p>
  </div>
)

// Landing page component for non-authenticated users
const LandingPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center max-w-2xl mx-auto px-4">
      <h1 className="text-5xl font-bold text-gray-900 mb-6">
        Welcome to <span className="text-blue-600">Zap Stop</span>
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Your comprehensive rental car management solution
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">🚗</div>
            <h3 className="font-semibold text-gray-900">Car Management</h3>
            <p className="text-sm text-gray-600">Track and manage your fleet</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-900">Driver Management</h3>
            <p className="text-sm text-gray-600">Monitor driver performance</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-600">Real-time insights and reports</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default function HomePage() {
  const { user, loading } = useBackendAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (user) {
        setIsRedirecting(true)
        // Add a small delay to show the loading state
        setTimeout(() => {
          router.push('/dashboard')
        }, 100)
      } else {
        // Show landing page for non-authenticated users
        // Don't redirect immediately to login
      }
    }
  }, [user, loading, router])

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />
  }

  // Show redirecting state
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <LandingPage />
  }

  return null
}