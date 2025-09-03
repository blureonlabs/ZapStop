'use client'

import { useState, useEffect } from 'react'
import { supabase, User, Car } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'

export default function DriversPage() {
  const [drivers, setDrivers] = useState<User[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [showDriverDialog, setShowDriverDialog] = useState(false)

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
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch all cars
      const { data: carsData } = await supabase
        .from('cars')
        .select('*')
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
    try {
      // First, create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: driverForm.email,
        password: driverForm.password,
        options: {
          data: {
            name: driverForm.name,
            role: driverForm.role
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Then, create the user record in our users table
        const { error: userError } = await supabase
          .from('users')
                  .insert([{
          id: authData.user.id,
          name: driverForm.name,
          email: driverForm.email,
          phone: driverForm.phone,
          role: driverForm.role,
          assigned_car_id: driverForm.assigned_car_id === 'none' ? null : driverForm.assigned_car_id || null
        }])

        if (userError) throw userError

        toast.success('Driver created successfully')
        setShowDriverDialog(false)
        setDriverForm({ name: '', email: '', phone: '', password: '', role: 'driver', assigned_car_id: 'none' })
        fetchData()
      }
    } catch (error: any) {
      console.error('Error creating driver:', error)
      toast.error(error.message || 'Failed to create driver')
    }
  }

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: driverId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete driver')
      }

      toast.success('Driver deleted successfully')
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
        <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Driver</DialogTitle>
              <DialogDescription>
                Create a new driver account with authentication
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
              <div>
                <Label htmlFor="driver_password">Password</Label>
                <Input
                  id="driver_password"
                  type="password"
                  value={driverForm.password}
                  onChange={(e) => setDriverForm({...driverForm, password: e.target.value})}
                  placeholder="Enter temporary password"
                />
              </div>
              <div>
                <Label htmlFor="assigned_car">Assigned Car (Optional)</Label>
                <Select value={driverForm.assigned_car_id} onValueChange={(value) => setDriverForm({...driverForm, assigned_car_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a car" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No car assigned</SelectItem>
                    {cars.map((car) => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.plate_number} - {car.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateDriver} className="w-full">
                Create Driver
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
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
