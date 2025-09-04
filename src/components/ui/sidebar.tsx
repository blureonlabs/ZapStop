'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Home, 
  DollarSign, 
  Receipt, 
  Car, 
  Users, 
  Calendar, 
  LogOut, 
  User, 
  Settings, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Logo from './logo'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { appUser, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

  const handleProfile = () => {
    toast.info('Profile feature coming soon!')
  }

  const handleSettings = () => {
    toast.info('Settings feature coming soon!')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    // Close sidebar on mobile after navigation
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onToggle()
    }
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'accountant':
        return 'bg-blue-100 text-blue-800'
      case 'driver':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      roles: ['admin', 'accountant', 'driver']
    },
    {
      name: 'Cars',
      path: '/dashboard/cars',
      icon: Car,
      roles: ['admin']
    },
    {
      name: 'Drivers',
      path: '/dashboard/drivers',
      icon: Users,
      roles: ['admin']
    },
    {
      name: 'Active Drivers',
      path: '/dashboard/active-drivers',
      icon: Users,
      roles: ['admin']
    },
    {
      name: 'Earnings',
      path: '/dashboard/earnings',
      icon: DollarSign,
      roles: ['admin', 'accountant', 'driver']
    },
    {
      name: 'Expenses',
      path: '/dashboard/expenses',
      icon: Receipt,
      roles: ['admin', 'accountant', 'driver']
    },
    {
      name: appUser?.role === 'admin' ? 'Leave Management' : 'Leave Requests',
      path: appUser?.role === 'admin' ? '/dashboard/leave-management' : '/dashboard/leave',
      icon: Calendar,
      roles: ['admin', 'driver']
    }
  ]

  const filteredItems = navigationItems.filter(item => 
    appUser?.role && item.roles.includes(appUser.role)
  )

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-16' : 'w-72'}
        lg:translate-x-0 lg:static lg:z-auto
        shadow-xl lg:shadow-none
        ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {!isCollapsed ? (
              <Logo size="sm" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex h-8 w-8 p-0"
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="lg:hidden h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`
                    w-full h-14 rounded-lg transition-all duration-200
                    ${active 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }
                    ${isCollapsed ? 'px-2 justify-center' : 'px-4 justify-start text-left'}
                  `}
                  onClick={() => handleNavigation(item.path)}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && (
                    <span className="text-base font-medium ml-3">{item.name}</span>
                  )}
                </Button>
              )
            })}
          </nav>

          {/* Bottom Section - User Info and Profile Actions */}
          <div className="mt-auto">
            {/* User Info Section - Desktop Only */}
            {appUser && (
              <div className="hidden lg:block p-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(appUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {appUser.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {appUser.email}
                      </p>
                      <Badge className={`text-xs ${getRoleBadgeColor(appUser.role)}`}>
                        {appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Profile Actions - Bottom Left - Desktop Only */}
            {appUser && (
              <div className="hidden lg:block p-4 border-t border-gray-200">
                {isCollapsed ? (
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleProfile}
                      className="h-8 w-8 p-0 mx-auto"
                      title="Profile"
                    >
                      <User className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSettings}
                      className="h-8 w-8 p-0 mx-auto"
                      title="Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="h-8 w-8 p-0 mx-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleProfile}
                      className="flex-1 text-xs"
                    >
                      <User className="h-3 w-3 mr-1" />
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSettings}
                      className="flex-1 text-xs"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-3 w-3 mr-1" />
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
