'use client'

import { useState, useEffect } from 'react'
import { supabase, Car } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, Car as CarIcon } from 'lucide-react'
import { toast } from 'sonner'

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [showCarDialog, setShowCarDialog] = useState(false)
  const [editingCar, setEditingCar] = useState<Car | null>(null)
  const [creatingCar, setCreatingCar] = useState(false)
  const [updatingCar, setUpdatingCar] = useState(false)

  // Form states
  const [carForm, setCarForm] = useState({
    plate_number: '',
    model: '',
    monthly_due: 7500
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch all users (drivers)
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      // Fetch all cars
      const { data: carsData } = await supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false })

      // Manually join driver data with cars
      const carsWithDrivers = carsData?.map(car => {
        const assignedDriver = usersData?.find(user => user.id === car.assigned_driver_id)
        return {
          ...car,
          assigned_driver: assignedDriver ? { name: assignedDriver.name, email: assignedDriver.email } : null
        }
      }) || []

      setCars(carsWithDrivers)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCar = async () => {
    if (creatingCar) return // Prevent multiple submissions
    
    try {
      setCreatingCar(true)
      
      // Validate form data
      if (!carForm.plate_number.trim()) {
        toast.error('Plate number is required')
        return
      }
      
      if (!carForm.model.trim()) {
        toast.error('Model is required')
        return
      }

      if (carForm.monthly_due <= 0) {
        toast.error('Monthly due must be greater than 0')
        return
      }

      // Create new car
      const { error: carError } = await supabase
        .from('cars')
        .insert([{
          plate_number: carForm.plate_number,
          model: carForm.model,
          monthly_due: carForm.monthly_due,
          assigned_driver_id: null
        }])

      if (carError) throw carError

      toast.success('Car created successfully')
      setShowCarDialog(false)
      setCarForm({ plate_number: '', model: '', monthly_due: 7500 })
      fetchData()
    } catch (error: any) {
      console.error('Error creating car:', error)
      toast.error(error.message || 'Failed to create car')
    } finally {
      setCreatingCar(false)
    }
  }

  const handleUpdateCar = async () => {
    if (!editingCar || updatingCar) return

    try {
      setUpdatingCar(true)
      
      // Validate form data
      if (!carForm.plate_number.trim()) {
        toast.error('Plate number is required')
        return
      }
      
      if (!carForm.model.trim()) {
        toast.error('Model is required')
        return
      }

      if (carForm.monthly_due <= 0) {
        toast.error('Monthly due must be greater than 0')
        return
      }

      // Update existing car
      const { error: carError } = await supabase
        .from('cars')
        .update({
          plate_number: carForm.plate_number,
          model: carForm.model,
          monthly_due: carForm.monthly_due
        })
        .eq('id', editingCar.id)

      if (carError) throw carError

      toast.success('Car updated successfully')
      setShowCarDialog(false)
      setEditingCar(null)
      setCarForm({ plate_number: '', model: '', monthly_due: 7500 })
      fetchData()
    } catch (error: any) {
      console.error('Error updating car:', error)
      toast.error(error.message || 'Failed to update car')
    } finally {
      setUpdatingCar(false)
    }
  }

  const handleEditCar = (car: Car) => {
    setEditingCar(car)
    setCarForm({
      plate_number: car.plate_number,
      model: car.model,
      monthly_due: car.monthly_due
    })
    setShowCarDialog(true)
  }

  const handleDeleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to delete this car? This will automatically unassign any drivers from this car.')) return

    try {
      console.log('Attempting to delete car:', carId)
      
      // First, unassign any drivers from this car
      const { data: driversWithCar, error: checkError } = await supabase
        .from('users')
        .select('id, name')
        .eq('assigned_car_id', carId)

      if (checkError) {
        console.error('Error checking driver assignments:', checkError)
        throw new Error('Failed to check driver assignments')
      }

      console.log('Drivers assigned to this car:', driversWithCar)

      // Unassign all drivers from this car
      if (driversWithCar && driversWithCar.length > 0) {
        console.log('Unassigning drivers from car:', driversWithCar.map(d => d.name).join(', '))
        
        const { error: unassignError } = await supabase
          .from('users')
          .update({ assigned_car_id: null })
          .eq('assigned_car_id', carId)

        if (unassignError) {
          console.error('Failed to unassign drivers:', unassignError)
          throw new Error('Failed to unassign drivers from car')
        }

        console.log('Successfully unassigned all drivers from car')
        toast.success(`Unassigned ${driversWithCar.length} driver(s) from car`)
      }

      // Now delete the car
      console.log('Proceeding with car deletion')
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
            setCarForm({ plate_number: '', model: '', monthly_due: 7500 })
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

              <Button 
                onClick={editingCar ? handleUpdateCar : handleCreateCar} 
                className="w-full"
                disabled={creatingCar || updatingCar}
              >
                {creatingCar ? 'Creating Car...' : updatingCar ? 'Updating Car...' : editingCar ? 'Update Car' : 'Create Car'}
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
                        {(car as { assigned_driver?: { name?: string } }).assigned_driver?.name || 'Not assigned'}
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
