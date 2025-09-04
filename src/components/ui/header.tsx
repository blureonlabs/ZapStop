'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
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
import { LogOut, User, Settings, Menu, X, Home, DollarSign, Receipt } from 'lucide-react'
import Logo from './logo'
import { toast } from 'sonner'

interface HeaderProps {
  title?: string
  showUserMenu?: boolean
}

export default function Header({ title, showUserMenu = true }: HeaderProps) {
  const { appUser, signOut } = useAuth()
  const router = useRouter()
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
                  className="w-full justify-start h-12 text-left"
                  onClick={() => handleNavigation('/dashboard')}
                >
                  <Home className="mr-3 h-5 w-5" />
                  <span className="text-base">Dashboard</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-left"
                  onClick={() => handleNavigation('/dashboard/earnings')}
                >
                  <DollarSign className="mr-3 h-5 w-5" />
                  <span className="text-base">Earnings</span>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 text-left"
                  onClick={() => handleNavigation('/dashboard/expenses')}
                >
                  <Receipt className="mr-3 h-5 w-5" />
                  <span className="text-base">Expenses</span>
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
