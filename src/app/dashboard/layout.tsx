'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { LogOut, Car, Users, BarChart3, Receipt } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, appUser, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !appUser) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const getNavigationItems = () => {
    switch (appUser.role) {
      case 'admin':
        return [
          { href: '/dashboard', label: 'Overview', icon: BarChart3 },
          { href: '/dashboard/drivers', label: 'Drivers', icon: Users },
          { href: '/dashboard/cars', label: 'Cars', icon: Car },
          { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
        ]
      case 'accountant':
        return [
          { href: '/dashboard', label: 'Overview', icon: BarChart3 },
          { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
          { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
        ]
      case 'driver':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
          { href: '/dashboard/earnings', label: 'Earnings', icon: Receipt },
          { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
        ]
      default:
        return []
    }
  }

  const navigationItems = getNavigationItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Zap Stop</h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {appUser.name}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <nav className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
