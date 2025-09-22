'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
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
import { LogOut, User, Settings, Menu, X, Home, DollarSign, Receipt, Car, Users, Calendar } from 'lucide-react'
import Logo from './logo'
import { toast } from 'sonner'

interface HeaderProps {
  title?: string
  showUserMenu?: boolean
}

export default function Header({ title, showUserMenu = true }: HeaderProps) {
  const { appUser, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
    setIsMenuOpen(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'accountant':
        return 'bg-blue-100 text-blue-800'
      case 'driver':
        return 'bg-green-100 text-green-800'
      case 'owner':
        return 'bg-purple-100 text-purple-800'
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

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
        {/* Left side - Logo and Title */}
        <div className="flex items-center space-x-4">
          <Logo size="sm" />
          {title && (
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>
          )}
        </div>

        {/* Center - Desktop Navigation Menu */}
        <div className="hidden md:flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation('/dashboard')}
            className={`text-gray-700 hover:text-gray-900 ${
              isActive('/dashboard') 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                : ''
            }`}
          >
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          
          {/* Admin-only pages */}
          {appUser?.role === 'admin' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation('/dashboard/cars')}
                className={`text-gray-700 hover:text-gray-900 ${
                  isActive('/dashboard/cars') 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                    : ''
                }`}
              >
                <Car className="mr-2 h-4 w-4" />
                Cars
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation('/dashboard/drivers')}
                className={`text-gray-700 hover:text-gray-900 ${
                  isActive('/dashboard/drivers') 
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                    : ''
                }`}
              >
                <Users className="mr-2 h-4 w-4" />
                Drivers
              </Button>
            </>
          )}
          
          {/* All roles can access earnings and expenses */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation('/dashboard/earnings')}
            className={`text-gray-700 hover:text-gray-900 ${
              isActive('/dashboard/earnings') 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                : ''
            }`}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Earnings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation('/dashboard/expenses')}
            className={`text-gray-700 hover:text-gray-900 ${
              isActive('/dashboard/expenses') 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                : ''
            }`}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Expenses
          </Button>
          
          {/* Leave requests - drivers can request, admins can manage */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation(appUser?.role === 'admin' ? '/dashboard/leave-management' : '/dashboard/leave')}
            className={`text-gray-700 hover:text-gray-900 ${
              isActive(appUser?.role === 'admin' ? '/dashboard/leave-management' : '/dashboard/leave') 
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' 
                : ''
            }`}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {appUser?.role === 'admin' ? 'Leave Management' : 'Leave Requests'}
          </Button>
        </div>

        {/* Right side - Hamburger Menu & User Menu */}
        <div className="flex items-center space-x-2">
          {/* Hamburger Menu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* User Menu */}
          {showUserMenu && appUser && (
            <div className="hidden md:flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{appUser.name}</p>
                  <Badge className={getRoleBadgeColor(appUser.role)}>
                    {appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
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
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfile}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              {/* Menu Header */}
              <div className="flex items-center justify-between mb-8">
                <Logo size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* User Info */}
              {appUser && (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                        {getInitials(appUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{appUser.name}</p>
                      <p className="text-sm text-gray-600">{appUser.email}</p>
                      <Badge className={getRoleBadgeColor(appUser.role)}>
                        {appUser.role.charAt(0).toUpperCase() + appUser.role.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Menu */}
              <nav className="space-y-2">
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 text-left ${
                    isActive('/dashboard') 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                      : ''
                  }`}
                  onClick={() => handleNavigation('/dashboard')}
                >
                  <Home className="mr-3 h-5 w-5" />
                  <span className="text-base">Dashboard</span>
                </Button>

                {/* Admin-only pages */}
                {appUser?.role === 'admin' && (
                  <>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start h-12 text-left ${
                        isActive('/dashboard/cars') 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : ''
                      }`}
                      onClick={() => handleNavigation('/dashboard/cars')}
                    >
                      <Car className="mr-3 h-5 w-5" />
                      <span className="text-base">Cars</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start h-12 text-left ${
                        isActive('/dashboard/drivers') 
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                          : ''
                      }`}
                      onClick={() => handleNavigation('/dashboard/drivers')}
                    >
                      <Users className="mr-3 h-5 w-5" />
                      <span className="text-base">Drivers</span>
                    </Button>
                  </>
                )}

                {/* All roles can access earnings and expenses */}
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 text-left ${
                    isActive('/dashboard/earnings') 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                      : ''
                  }`}
                  onClick={() => handleNavigation('/dashboard/earnings')}
                >
                  <DollarSign className="mr-3 h-5 w-5" />
                  <span className="text-base">Earnings</span>
                </Button>

                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 text-left ${
                    isActive('/dashboard/expenses') 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                      : ''
                  }`}
                  onClick={() => handleNavigation('/dashboard/expenses')}
                >
                  <Receipt className="mr-3 h-5 w-5" />
                  <span className="text-base">Expenses</span>
                </Button>

                <Button
                  variant="ghost"
                  className={`w-full justify-start h-12 text-left ${
                    isActive(appUser?.role === 'admin' ? '/dashboard/leave-management' : '/dashboard/leave') 
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700' 
                      : ''
                  }`}
                  onClick={() => handleNavigation(appUser?.role === 'admin' ? '/dashboard/leave-management' : '/dashboard/leave')}
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  <span className="text-base">{appUser?.role === 'admin' ? 'Leave Management' : 'Leave Requests'}</span>
                </Button>

                <div className="border-t pt-4 mt-4">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-left"
                    onClick={handleProfile}
                  >
                    <User className="mr-3 h-5 w-5" />
                    <span className="text-base">Profile</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-left"
                    onClick={handleSettings}
                  >
                    <Settings className="mr-3 h-5 w-5" />
                    <span className="text-base">Settings</span>
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 text-left text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span className="text-base">Log out</span>
                  </Button>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
