'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/ui/sidebar'
import { Menu, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import Logo from '@/components/ui/logo'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, appUser, signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'driver':
        return 'bg-green-100 text-green-800'
      case 'accountant':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleProfile = () => {
    router.push('/dashboard/profile')
  }

  const handleLogout = async () => {
    try {
      console.log('Dashboard layout logout initiated')
      await signOut()
      
      // Force redirect to login page
      window.location.href = '/login'
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
      
      // Even if logout fails, try to redirect
      window.location.href = '/login'
    }
  }

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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Always visible on mobile */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 lg:hidden sticky top-0 z-30">
        <div className="flex items-center justify-between">
          {/* Left: Hamburger Menu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {/* Center: Logo */}
          <div className="flex items-center">
            <Logo size="sm" />
          </div>
          
          {/* Right: Mobile User Profile */}
          {appUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-semibold">
                      {getInitials(appUser.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{appUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {appUser.email}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs mt-1 w-fit ${getRoleBadgeColor(appUser.role)}`}
                    >
                      {appUser.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfile}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar - Fixed/Sticky */}
        <div className="hidden lg:block">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 flex flex-col lg:ml-64 min-h-screen">
          {/* Desktop Header - Only visible on desktop */}
          <header className="hidden lg:block bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">
                Dashboard
              </h1>
            </div>
          </header>

          {/* Page Content - Scrollable */}
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Sidebar Overlay */}
        <div className="lg:hidden">
          <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </div>
      </div>
    </div>
  )
}
