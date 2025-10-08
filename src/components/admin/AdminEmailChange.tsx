'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Mail, User } from 'lucide-react'

interface AdminEmailChangeProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
  trigger?: React.ReactNode
}

export function AdminEmailChange({ 
  userId, 
  userName, 
  userEmail, 
  userRole,
  trigger 
}: AdminEmailChangeProps) {
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    if (newEmail === userEmail) {
      toast.error('New email must be different from current email')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/change-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          newEmail
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change email')
      }

      const result = await response.json()
      toast.success(result.message || 'Email changed successfully')
      
      // Reset form and close dialog
      setNewEmail('')
      setOpen(false)
      
      // Refresh the page to show updated email
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Admin email change error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change email')
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="text-xs">
      <Mail className="h-3 w-3 mr-1" />
      Change Email
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
            <Mail className="h-5 w-5 mr-2" />
            Change Email
          </DialogTitle>
          <DialogDescription>
            Change email for <strong>{userName}</strong> ({userRole})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* User Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="font-medium text-sm">{userName}</p>
                <p className="text-xs text-gray-500">Current: {userEmail}</p>
                <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded mt-1">
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address"
                required
                className={newEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) ? 'border-red-500' : ''}
              />
              {newEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) && (
                <p className="text-sm text-red-500">Please enter a valid email address</p>
              )}
              {newEmail === userEmail && newEmail.length > 0 && (
                <p className="text-sm text-red-500">New email must be different from current email</p>
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
                disabled={loading || !newEmail || newEmail === userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)}
                className="flex-1"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Change Email
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
