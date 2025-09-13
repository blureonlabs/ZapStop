'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBackendAuth } from '@/contexts/BackendAuthContext'
import { apiService, User, Car, Owner } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import PageHeader from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, User as UserIcon, Car as CarIcon, RefreshCw, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DriversPage() {
  const { user, loading: authLoading } = useBackendAuth()
  const router = useRouter()
  const [drivers, setDrivers] = useState<User[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showDriverDialog, setShowDriverDialog] = useState(false)
  const [editingDriver, setEditingDriver] = useState<User | null>(null)
  const [creatingDriver, setCreatingDriver] = useState(false)

  // Form states
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'driver' as const,
    assigned_car_id: 'none'
  })

  // Admin creation states
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  })
  const [creatingAdmin, setCreatingAdmin] = useState(false)

  useEffect(() => {
    // Check if user has permission to access this page
    if (!authLoading && user) {
      if (user.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.')
        router.push('/dashboard')
        return
      }
      fetchData()
    }
  }, [user, authLoading, router])

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
  if (user && user.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">You don&apos;t have permission to access the drivers management page.</p>
        <Button onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all users, cars, and owners using the backend API
      const [usersData, carsData, ownersData] = await Promise.all([
        apiService.getUsers(),
        apiService.getCars(),
        apiService.getOwners()
      ])

      setDrivers(usersData?.filter(u => u.role === 'driver') || [])
      setCars(carsData || [])
      setOwners(ownersData || [])
      
      console.log('Drivers page - Drivers data:', usersData?.filter(u => u.role === 'driver'))
      console.log('Drivers page - Cars data:', carsData)
      console.log('Drivers page - Owners data:', ownersData)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDriver = async () => {
    if (creatingDriver) return // Prevent multiple submissions
    
    try {
      setCreatingDriver(true)
      
      // Validate form data
      if (!driverForm.name.trim()) {
        toast.error('Driver name is required')
        return
      }
      
      if (!driverForm.email.trim()) {
        toast.error('Email is required')
        return
      }
      
      if (!driverForm.phone.trim()) {
        toast.error('Phone is required')
        return
      }
      
      if (!driverForm.password.trim()) {
        toast.error('Password is required')
        return
      }

      // Create new driver using the backend API
      const newUser = await apiService.createUser({
        name: driverForm.name,
        email: driverForm.email,
        phone: driverForm.phone,
        password: driverForm.password,
        role: 'driver',
        assigned_car_id: driverForm.assigned_car_id === 'none' ? undefined : driverForm.assigned_car_id || undefined
      })

      // If a car was assigned, also update the car's assigned_driver_id
      if (driverForm.assigned_car_id && driverForm.assigned_car_id !== 'none') {
        await apiService.updateCar(driverForm.assigned_car_id, {
          assigned_driver_id: newUser.id
        })
      }

      toast.success('Driver created successfully')
      setShowDriverDialog(false)
      setDriverForm({ name: '', email: '', phone: '', password: '', role: 'driver', assigned_car_id: 'none' })
      fetchData()
    } catch (error: unknown) {
      console.error('Error creating driver:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create driver'
      toast.error(errorMessage)
    } finally {
      setCreatingDriver(false)
    }
  }

  const handleUpdateDriver = async () => {
    if (creatingDriver || !editingDriver) return
    
    try {
      setCreatingDriver(true)
      
      // Validate form data
      if (!driverForm.name.trim()) {
        toast.error('Driver name is required')
        return
      }
      
      if (!driverForm.email.trim()) {
        toast.error('Email is required')
        return
      }
      
      if (!driverForm.phone.trim()) {
        toast.error('Phone is required')
        return
      }

      // Update driver using the backend API
      await apiService.updateUser(editingDriver.id, {
        name: driverForm.name,
        email: driverForm.email,
        phone: driverForm.phone,
        assigned_car_id: driverForm.assigned_car_id === 'none' ? undefined : driverForm.assigned_car_id || undefined
      })

      // Handle car assignment changes
      const oldCarId = editingDriver.assigned_car_id
      const newCarId = driverForm.assigned_car_id === 'none' ? undefined : driverForm.assigned_car_id

      // If car assignment changed, update both old and new cars
      if (oldCarId !== newCarId) {
        // Remove driver from old car
        if (oldCarId) {
          await apiService.updateCar(oldCarId, {
            assigned_driver_id: undefined
          })
        }
        
        // Assign driver to new car
        if (newCarId) {
          await apiService.updateCar(newCarId, {
            assigned_driver_id: editingDriver.id
          })
        }
      }

      toast.success('Driver updated successfully')
      setShowDriverDialog(false)
      setEditingDriver(null)
      setDriverForm({ name: '', email: '', phone: '', password: '', role: 'driver', assigned_car_id: 'none' })
      fetchData()
    } catch (error: unknown) {
      console.error('Error updating driver:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update driver'
      toast.error(errorMessage)
    } finally {
      setCreatingDriver(false)
    }
  }

  const handleEditDriver = (driver: User) => {
    setEditingDriver(driver)
    setDriverForm({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      password: '', // Don't pre-fill password for security
      role: 'driver',
      assigned_car_id: driver.assigned_car_id || 'none'
    })
    setShowDriverDialog(true)
  }

  const handleDeleteDriver = async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId)
    
    // Check if driver has a car assigned
    if (driver?.assigned_car_id) {
      const assignedCar = cars.find(c => c.id === driver.assigned_car_id)
      const carInfo = assignedCar ? `${assignedCar.plate_number} - ${assignedCar.model}` : 'Unknown Car'
      
      toast.error(
        `Cannot delete driver. Please unassign the car "${carInfo}" first.`,
        { duration: 8000 }
      )
      return
    }

    if (!confirm('Are you sure you want to delete this driver?')) return

    try {
      await apiService.deleteUser(driverId)
      toast.success('Driver deleted successfully')
      fetchData()
    } catch (error: unknown) {
      console.error('Error deleting driver:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete driver'
      toast.error(errorMessage)
    }
  }

  const handleUnassignCar = async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId)
    if (!driver?.assigned_car_id) return

    try {
      // Update driver to remove car assignment
      await apiService.updateUser(driverId, {
        assigned_car_id: undefined
      })
      
      // Also update the car to remove driver assignment
      await apiService.updateCar(driver.assigned_car_id, {
        assigned_driver_id: undefined
      })
      
      toast.success('Car unassigned successfully')
      fetchData()
    } catch (error: unknown) {
      console.error('Error unassigning car:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to unassign car'
      toast.error(errorMessage)
    }
  }

  const handleCreateAdmin = async () => {
    if (creatingAdmin) return
    
    try {
      setCreatingAdmin(true)
      
      // Validate form data
      if (!adminForm.name.trim()) {
        toast.error('Admin name is required')
        return
      }
      
      if (!adminForm.email.trim()) {
        toast.error('Email is required')
        return
      }
      
      if (!adminForm.phone.trim()) {
        toast.error('Phone is required')
        return
      }
      
      if (!adminForm.password.trim()) {
        toast.error('Password is required')
        return
      }

      // Create new admin using the backend API
      await apiService.createUser({
        name: adminForm.name,
        email: adminForm.email,
        phone: adminForm.phone,
        password: adminForm.password,
        role: 'admin'
      })

      toast.success('Admin created successfully')
      setShowAdminDialog(false)
      setAdminForm({ name: '', email: '', phone: '', password: '' })
      fetchData()
    } catch (error: unknown) {
      console.error('Error creating admin:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create admin'
      toast.error(errorMessage)
    } finally {
      setCreatingAdmin(false)
    }
  }

  // Get available cars for assignment (cars not assigned to any driver)
  const getAvailableCars = () => {
    return cars.filter(car => !car.assigned_driver_id)
  }

  // Get car info by ID
  const getCarInfo = (carId: string | null | undefined) => {
    if (!carId) return null
    return cars.find(c => c.id === carId)
  }

  // Get owner info by car's owner_id
  const getOwnerInfo = (carId: string | null | undefined) => {
    const car = getCarInfo(carId)
    if (!car?.owner_id) return null
    return owners.find(o => o.id === car.owner_id)
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
      <PageHeader 
        title="Driver Management" 
        description="Manage driver accounts and car assignments"
      >
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showAdminDialog} onOpenChange={(open) => {
            setShowAdminDialog(open)
            if (!open) {
              setAdminForm({ name: '', email: '', phone: '', password: '' })
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Admin</DialogTitle>
                <DialogDescription>
                  Create a new admin user account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="admin-name">Admin Name *</Label>
                  <Input
                    id="admin-name"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({...adminForm, name: e.target.value})}
                    placeholder="Enter admin name"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-phone">Phone *</Label>
                  <Input
                    id="admin-phone"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm({...adminForm, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password">Password *</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>
                <Button 
                  onClick={handleCreateAdmin} 
                  className="w-full"
                  disabled={creatingAdmin}
                >
                  {creatingAdmin ? 'Creating Admin...' : 'Create Admin'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  {editingDriver ? 'Update driver information' : 'Create a new driver account'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Driver Name *</Label>
                  <Input
                    id="name"
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({...driverForm, name: e.target.value})}
                    placeholder="Enter driver name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={driverForm.email}
                    onChange={(e) => setDriverForm({...driverForm, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({...driverForm, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                {!editingDriver && (
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={driverForm.password}
                      onChange={(e) => setDriverForm({...driverForm, password: e.target.value})}
                      placeholder="Enter password"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="assigned_car">Assigned Car</Label>
                  <Select value={driverForm.assigned_car_id} onValueChange={(value) => setDriverForm({...driverForm, assigned_car_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a car" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No car assigned</SelectItem>
                      {getAvailableCars().map((car) => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.plate_number} - {car.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editingDriver && editingDriver.assigned_car_id && (
                    <p className="text-sm text-gray-500 mt-1">
                      Current car: {getCarInfo(editingDriver.assigned_car_id)?.plate_number} - {getCarInfo(editingDriver.assigned_car_id)?.model}
                    </p>
                  )}
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
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered drivers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers with Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Drivers without Cars</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
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
          <CardTitle>Driver Accounts</CardTitle>
          <CardDescription>
            Manage driver accounts and their car assignments
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Car Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No drivers found. Add your first driver to get started.
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => {
                    const assignedCar = getCarInfo(driver.assigned_car_id)
                    const carOwner = getOwnerInfo(driver.assigned_car_id)
                    
                    return (
                      <tr key={driver.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {driver.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {driver.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {driver.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignedCar ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {assignedCar.plate_number}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {assignedCar.model}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {carOwner ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {carOwner.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">No owner</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(driver.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {driver.assigned_car_id && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUnassignCar(driver.id)}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                Unassign Car
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditDriver(driver)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDeleteDriver(driver.id)}
                              disabled={!!driver.assigned_car_id}
                              title={driver.assigned_car_id ? "Cannot delete - driver has car assigned" : "Delete driver"}
                              className={driver.assigned_car_id ? "text-gray-400 cursor-not-allowed" : ""}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}