'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Key, User } from 'lucide-react'

interface AdminPasswordChangeProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  trigger?: React.ReactNode
}

export function AdminPasswordChange({ 
  userId, 
  userName, 
  userEmail, 
  userRole,
  trigger 
}: AdminPasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          newPassword
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      const result = await response.json()
      toast.success(result.message || 'Password changed successfully')
      
      // Reset form and close dialog
      setNewPassword('')
      setConfirmPassword('')
      setOpen(false)
    } catch (error) {
      console.error('Admin password change error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="text-xs">
      <Key className="h-3 w-3 mr-1" />
      Change Password
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Change password for <strong>{userName}</strong> ({userRole})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="font-medium text-sm">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded mt-1">
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                required
                className={newPassword.length > 0 && newPassword.length < 6 ? 'border-red-500' : ''}
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-sm text-red-500">Password must be at least 6 characters long</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className={confirmPassword.length > 0 && newPassword !== confirmPassword ? 'border-red-500' : ''}
              />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                className="flex-1"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
