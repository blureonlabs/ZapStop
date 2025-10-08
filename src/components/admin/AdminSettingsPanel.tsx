'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface AdminSettingsPanelProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
}

export function AdminSettingsPanel({ userId, userName, userEmail, userRole }: AdminSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  
  // Email form state
  const [emailData, setEmailData] = useState({
    newEmail: ''
  })

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
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
          newPassword: passwordData.newPassword
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change password')
      }

      toast.success(`Password for ${userName} (${userEmail}) changed successfully!`)
      setPasswordData({ newPassword: '', confirmPassword: '' })
      setIsOpen(false)
    } catch (error) {
      console.error('Admin password change error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (emailData.newEmail === userEmail) {
      toast.error('New email cannot be the same as the current email')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailData.newEmail)) {
      toast.error('Invalid email format')
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
          newEmail: emailData.newEmail
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change email')
      }

      const result = await response.json()
      toast.success(result.message || `Email for ${userName} changed to ${emailData.newEmail} successfully!`)
      setEmailData({ newEmail: '' })
      setIsOpen(false)
    } catch (error) {
      console.error('Admin email change error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to change email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="flex items-center">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Settings - {userName}</DialogTitle>
          <DialogDescription>
            Manage password and email for {userName} ({userEmail}). Role: {userRole}.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          <TabsContent value="password" className="pt-4">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Set New Password
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="email" className="pt-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">New Email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                  placeholder="Enter new email"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Set New Email
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}