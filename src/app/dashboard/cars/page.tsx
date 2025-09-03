'use client'

import { useState, useEffect } from 'react'
import { supabase, User, Car } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Car as CarIcon } from 'lucide-react'
import { toast } from 'sonner'

export default function CarsPage() {
  const [drivers, setDrivers] = useState<User[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [showCarDialog, setShowCarDialog] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)

  // Form states
  const [carForm, setCarForm] = useState({
    plate_number: '',
    model: '',
    monthly_due: 7500,
    assigned_driver_id: 'none'
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

      // Fetch all cars with assigned driver info
      const { data: carsData } = await supabase
        .from('cars')
        .select(`
          *,
          users!cars_assigned_driver_id_fkey(name, email)
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

  const handleCreateCar = async () => {
    try {
      if (editingCar) {
        // Get the current car data to check for driver assignment changes
        const currentCar = cars.find(c => c.id === editingCar.id)
        const oldDriverId = currentCar?.assigned_driver_id
        const newDriverId = carForm.assigned_driver_id === 'none' ? null : carForm.assigned_driver_id || null

        // Update the car
        const { error: carError } = await supabase
          .from('cars')
          .update({
            plate_number: carForm.plate_number,
            model: carForm.model,
            monthly_due: carForm.monthly_due,
            assigned_driver_id: newDriverId
          })
          .eq('id', editingCar.id)

        if (carError) throw carError

        // If the driver assignment changed, update the users table
        if (oldDriverId !== newDriverId) {
          // Remove car assignment from old driver
          if (oldDriverId) {
            const { error: oldDriverError } = await supabase
              .from('users')
              .update({ assigned_car_id: null })
              .eq('id', oldDriverId)

            if (oldDriverError) {
              console.warn('Failed to unassign old driver:', oldDriverError)
            }
          }

          // Assign car to new driver
          if (newDriverId) {
            const { error: newDriverError } = await supabase
              .from('users')
              .update({ assigned_car_id: editingCar.id })
              .eq('id', newDriverId)

            if (newDriverError) {
              console.warn('Failed to assign new driver:', newDriverError)
            }
          }
        }

        toast.success('Car updated successfully')
      } else {
        // Create new car
        const { data: newCar, error: carError } = await supabase
          .from('cars')
          .insert([{
            plate_number: carForm.plate_number,
            model: carForm.model,
            monthly_due: carForm.monthly_due,
            assigned_driver_id: carForm.assigned_driver_id === 'none' ? null : carForm.assigned_driver_id || null
          }])
          .select()
          .single()

        if (carError) throw carError

        // If a driver is assigned, update the users table
        if (carForm.assigned_driver_id && carForm.assigned_driver_id !== 'none' && newCar) {
          const { error: driverError } = await supabase
            .from('users')
            .update({ assigned_car_id: newCar.id })
            .eq('id', carForm.assigned_driver_id)

          if (driverError) {
            console.warn('Failed to assign driver to new car:', driverError)
          }
        }

        toast.success('Car created successfully')
      }

      setShowCarDialog(false)
      setEditingCar(null)
      setCarForm({ plate_number: '', model: '', monthly_due: 7500, assigned_driver_id: 'none' })
      fetchData()
    } catch (error: any) {
      console.error('Error saving car:', error)
      toast.error(error.message || 'Failed to save car')
    }
  }

  const handleEditCar = (car: Car) => {
    setEditingCar(car)
    setCarForm({
      plate_number: car.plate_number,
      model: car.model,
      monthly_due: car.monthly_due,
      assigned_driver_id: car.assigned_driver_id || 'none'
    })
    setShowCarDialog(true)
  }

  const handleDeleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to delete this car?')) return

    try {
      // Check if any drivers are assigned to this car in the users table
      const { data: driversWithCar, error: checkError } = await supabase
        .from('users')
        .select('id, name')
        .eq('assigned_car_id', carId)

      if (checkError) {
        console.error('Error checking driver assignments:', checkError)
        throw new Error('Failed to check driver assignments')
      }

      if (driversWithCar && driversWithCar.length > 0) {
        const driverNames = driversWithCar.map(d => d.name).join(', ')
        toast.error(`Cannot delete car. The following drivers are still assigned: ${driverNames}. Please unassign them first.`)
        return
      }

      // Also check the car's assigned_driver_id field
      const carToDelete = cars.find(car => car.id === carId)
      if (carToDelete?.assigned_driver_id) {
        toast.error('Cannot delete car with assigned driver. Please unassign the driver first.')
        return
      }

      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', carId)

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message || 'Failed to delete car')
      }

      toast.success('Car deleted successfully')
      fetchData()
    } catch (error: any) {
      console.error('Error deleting car:', error)
      toast.error(error.message || 'Failed to delete car')
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
          <CarIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Car Management</h1>
        </div>
        <Dialog open={showCarDialog} onOpenChange={(open) => {
          setShowCarDialog(open)
          if (!open) {
            setEditingCar(null)
            setCarForm({ plate_number: '', model: '', monthly_due: 7500, assigned_driver_id: 'none' })
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Car
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCar ? 'Edit Car' : 'Add New Car'}</DialogTitle>
              <DialogDescription>
                {editingCar ? 'Update vehicle information' : 'Register a new vehicle in the fleet'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="plate_number">Plate Number</Label>
                <Input
                  id="plate_number"
                  value={carForm.plate_number}
                  onChange={(e) => setCarForm({...carForm, plate_number: e.target.value})}
                  placeholder="Enter plate number"
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={carForm.model}
                  onChange={(e) => setCarForm({...carForm, model: e.target.value})}
                  placeholder="Enter car model"
                />
              </div>
              <div>
                <Label htmlFor="monthly_due">Monthly Due (AED)</Label>
                <Input
                  id="monthly_due"
                  type="number"
                  value={carForm.monthly_due}
                  onChange={(e) => setCarForm({...carForm, monthly_due: Number(e.target.value)})}
                  placeholder="Enter monthly due amount"
                />
              </div>
              <div>
                <Label htmlFor="assigned_driver">Assigned Driver (Optional)</Label>
                <Select value={carForm.assigned_driver_id} onValueChange={(value) => setCarForm({...carForm, assigned_driver_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No driver assigned</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateCar} className="w-full">
                {editingCar ? 'Update Car' : 'Create Car'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cars.length}</div>
            <p className="text-xs text-muted-foreground">
              Fleet vehicles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cars.filter(c => c.assigned_driver_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Cars with drivers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Target</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              AED {(cars.length * 7500).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total monthly dues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cars Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fleet Vehicles</CardTitle>
          <CardDescription>
            Manage your vehicle fleet and driver assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cars.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No cars found. Add your first vehicle to get started.
                    </td>
                  </tr>
                ) : (
                  cars.map((car) => (
                    <tr key={car.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {car.plate_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {car.model}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        AED {car.monthly_due.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(car as { users?: { name?: string } }).users?.name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(car.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditCar(car)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteCar(car.id)}
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
