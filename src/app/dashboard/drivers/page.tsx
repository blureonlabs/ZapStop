'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, User, Car } from '@/lib/supabase'
import { userAPI } from '@/lib/edge-functions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { AdminSettingsPanel } from '@/components/admin/AdminSettingsPanel'

export default function DriversPage() {
  const { appUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [drivers, setDrivers] = useState<User[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [showDriverDialog, setShowDriverDialog] = useState(false)
  const [creatingDriver, setCreatingDriver] = useState(false)
  const [editingDriver, setEditingDriver] = useState<User | null>(null)

  // Form states
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'driver' as const,
    assigned_car_id: 'none'
  })

  useEffect(() => {
    // Check if user has permission to access this page
    if (!authLoading && appUser) {
      if (appUser.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.')
        router.push('/dashboard')
        return
      }
      fetchData()
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

  // Show access denied if not admin
  if (appUser && appUser.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">You don't have permission to access the drivers management page.</p>
        <Button onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const fetchData = async () => {
    try {
      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch all cars with their owners
      const { data: carsData } = await supabase
        .from('cars')
        .select(`
          *,
          owners (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      setDrivers(usersData?.filter(u => u.role === 'driver') || [])
      setCars(carsData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDriver = async () => {
    if (creatingDriver) return // Prevent multiple submissions
    
    console.log('Starting driver creation with form data:', {
      name: driverForm.name,
      email: driverForm.email,
      phone: driverForm.phone,
      role: driverForm.role,
      assigned_car_id: driverForm.assigned_car_id
    })
    
    try {
      setCreatingDriver(true)
      
      // Validate form data
      if (!driverForm.name.trim()) {
        toast.error('Name is required')
        setCreatingDriver(false)
        return
      }
      
      if (!driverForm.email.trim()) {
        toast.error('Email is required')
        setCreatingDriver(false)
        return
      }
      
      if (!driverForm.password.trim()) {
        toast.error('Password is required')
        setCreatingDriver(false)
        return
      }
      
      if (driverForm.password.length < 6) {
        toast.error('Password must be at least 6 characters long')
        setCreatingDriver(false)
        return
      }

      // Check if user already exists in our system before attempting to create
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', driverForm.email)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError)
        toast.error('Failed to validate email address')
        setCreatingDriver(false)
        return
      }

      if (existingUser) {
        toast.error('A driver with this email already exists in the system')
        setCreatingDriver(false)
        return
      }

      // Use Edge Function to create the user
      const result = await userAPI.createDriver({
        name: driverForm.name,
        email: driverForm.email,
        password: driverForm.password,
        phone: driverForm.phone,
        role: driverForm.role,
        assigned_car_id: driverForm.assigned_car_id === 'none' ? null : driverForm.assigned_car_id || null
      })

      console.log('User created successfully:', result)
      toast.success('Driver created successfully! User can login immediately.')
      setShowDriverDialog(false)
      setDriverForm({ name: '', email: '', phone: '', password: '', role: 'driver', assigned_car_id: 'none' })
      fetchData()
    } catch (error: any) {
      console.error('Error creating driver:', error)
      toast.error(error.message || 'Failed to create driver')
    } finally {
      setCreatingDriver(false)
    }
  }

  const handleEditDriver = (driver: User) => {
    setEditingDriver(driver)
    setDriverForm({
      name: driver.name,
      email: driver.email,
      phone: driver.phone || '',
      password: '', // Don't pre-fill password for editing
      role: driver.role,
      assigned_car_id: driver.assigned_car_id || 'none'
    })
    setShowDriverDialog(true)
  }

  const handleUpdateDriver = async () => {
    if (creatingDriver || !editingDriver) return
    
    try {
      setCreatingDriver(true)
      
      // Validate form data
      if (!driverForm.name.trim()) {
        toast.error('Name is required')
        return
      }
      
      if (!driverForm.email.trim()) {
        toast.error('Email is required')
        return
      }

      const oldCarId = editingDriver.assigned_car_id
      const newCarId = driverForm.assigned_car_id === 'none' ? null : driverForm.assigned_car_id

      // Update the driver record
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: driverForm.name,
          email: driverForm.email,
          phone: driverForm.phone,
          assigned_car_id: newCarId
        })
        .eq('id', editingDriver.id)

      if (userError) throw userError

      // Handle car assignment changes
      if (oldCarId !== newCarId) {
        // Remove driver from old car
        if (oldCarId) {
          const { error: oldCarError } = await supabase
            .from('cars')
            .update({ assigned_driver_id: null })
            .eq('id', oldCarId)

          if (oldCarError) {
            console.warn('Failed to unassign old car:', oldCarError)
          }
        }

        // Assign driver to new car
        if (newCarId) {
          const { error: newCarError } = await supabase
            .from('cars')
            .update({ assigned_driver_id: editingDriver.id })
            .eq('id', newCarId)

          if (newCarError) {
            console.warn('Failed to assign new car:', newCarError)
          }
        }
      }

      toast.success('Driver updated successfully')
      setShowDriverDialog(false)
      setEditingDriver(null)
      setDriverForm({ name: '', email: '', phone: '', password: '', role: 'driver', assigned_car_id: 'none' })
      fetchData()
    } catch (error: any) {
      console.error('Error updating driver:', error)
      toast.error(error.message || 'Failed to update driver')
    } finally {
      setCreatingDriver(false)
    }
  }

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver? Any assigned cars will be unassigned.')) return

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ userId: driverId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete driver')
      }

      toast.success('Driver deleted successfully. Any assigned cars have been unassigned.')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting driver:', error)
      toast.error(error.message || 'Failed to delete driver')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
        </div>
        <Dialog open={showDriverDialog} onOpenChange={(open) => {
          setShowDriverDialog(open)
          if (!open) {
            setEditingDriver(null)
            setDriverForm({ name: '', email: '', phone: '', password: '', role: 'driver', assigned_car_id: 'none' })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              <DialogDescription>
                {editingDriver ? 'Update driver information' : 'Create a new driver account with authentication'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="driver_name">Name</Label>
                <Input
                  id="driver_name"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({...driverForm, name: e.target.value})}
                  placeholder="Enter driver name"
                />
              </div>
              <div>
                <Label htmlFor="driver_email">Email</Label>
                <Input
                  id="driver_email"
                  type="email"
                  value={driverForm.email}
                  onChange={(e) => setDriverForm({...driverForm, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="driver_phone">Phone</Label>
                <Input
                  id="driver_phone"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({...driverForm, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              {!editingDriver && (
                <div>
                  <Label htmlFor="driver_password">Password</Label>
                  <Input
                    id="driver_password"
                    type="password"
                    value={driverForm.password}
                    onChange={(e) => setDriverForm({...driverForm, password: e.target.value})}
                    placeholder="Enter temporary password (min 6 characters)"
                    className={driverForm.password.length > 0 && driverForm.password.length < 6 ? 'border-red-500' : ''}
                  />
                  {driverForm.password.length > 0 && driverForm.password.length < 6 && (
                    <p className="text-sm text-red-500 mt-1">Password must be at least 6 characters long</p>
                  )}
                </div>
              )}
              <div>
                <Label htmlFor="assigned_car">Assigned Car (Optional)</Label>
                <Select value={driverForm.assigned_car_id} onValueChange={(value) => setDriverForm({...driverForm, assigned_car_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a car" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No car assigned</SelectItem>
                    {(() => {
                      const availableCars = cars.filter(car => {
                        // If editing a driver, show their current car even if assigned
                        if (editingDriver && car.id === editingDriver.assigned_car_id) {
                          return true
                        }
                        // Otherwise, only show cars that are not assigned to any driver
                        return !car.assigned_driver_id
                      })
                      
                      if (availableCars.length === 0) {
                        return (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            No available cars
                          </div>
                        )
                      }
                      
                      return availableCars.map((car) => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.plate_number} - {car.model}
                        </SelectItem>
                      ))
                    })()}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={editingDriver ? handleUpdateDriver : handleCreateDriver} 
                className="w-full"
                disabled={creatingDriver}
              >
                {creatingDriver 
                  ? (editingDriver ? 'Updating Driver...' : 'Creating Driver...') 
                  : (editingDriver ? 'Update Driver' : 'Create Driver')
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active drivers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Cars</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter(d => d.assigned_car_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Drivers with cars
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter(d => !d.assigned_car_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Drivers without cars
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Drivers</CardTitle>
          <CardDescription>
            Manage driver accounts and assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Car</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owned By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No drivers found. Create your first driver to get started.
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => (
                    <tr key={driver.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cars.find(c => c.id === driver.assigned_car_id)?.plate_number || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const assignedCar = cars.find(c => c.id === driver.assigned_car_id);
                          return assignedCar?.owners?.name || 'No owner';
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditDriver(driver)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
          <AdminSettingsPanel
            userId={driver.id}
            userName={driver.name}
            userEmail={driver.email}
            userRole={driver.role}
          />
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteDriver(driver.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
