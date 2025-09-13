'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBackendAuth } from '@/contexts/BackendAuthContext'
import { apiService, Car, User, Owner } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import PageHeader from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Edit, Trash2, Car as CarIcon, RefreshCw, User as UserIcon, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CarsPage() {
  const { user, loading: authLoading } = useBackendAuth()
  const router = useRouter()
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
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
        <p className="text-gray-600 mb-4">You don&apos;t have permission to access the cars management page.</p>
        <Button onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    )
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch all cars, drivers, and owners using the backend API
      const [carsData, usersData, ownersData] = await Promise.all([
        apiService.getCars(),
        apiService.getUsers(),
        apiService.getOwners()
      ])
      
      console.log('Cars page - Cars data:', carsData)
      console.log('Cars page - Users data:', usersData)
      console.log('Cars page - Owners data:', ownersData)
      
      setCars(carsData || [])
      setDrivers(usersData?.filter(u => u.role === 'driver') || [])
      setOwners(ownersData || [])

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

      // Create new car using the backend API
      await apiService.createCar({
        plate_number: carForm.plate_number,
        model: carForm.model,
        monthly_due: carForm.monthly_due
      })

      toast.success('Car created successfully')
      setShowCarDialog(false)
      setCarForm({ plate_number: '', model: '', monthly_due: 7500 })
      fetchData()
    } catch (error: unknown) {
      console.error('Error creating car:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create car'
      toast.error(errorMessage)
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

      // Update existing car using the backend API
      await apiService.updateCar(editingCar.id, {
        plate_number: carForm.plate_number,
        model: carForm.model,
        monthly_due: carForm.monthly_due
      })

      toast.success('Car updated successfully')
      setShowCarDialog(false)
      setEditingCar(null)
      setCarForm({ plate_number: '', model: '', monthly_due: 7500 })
      fetchData()
    } catch (error: unknown) {
      console.error('Error updating car:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update car'
      toast.error(errorMessage)
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
    if (!confirm('Are you sure you want to delete this car? This will automatically unassign any drivers and owners from this car.')) return

    try {
      // Delete car using the backend API
      await apiService.deleteCar(carId)
      toast.success('Car deleted successfully')
      fetchData()
    } catch (error: unknown) {
      console.error('Error deleting car:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete car'
      toast.error(errorMessage)
    }
  }

  // Get driver name by ID
  const getDriverName = (driverId: string | null | undefined) => {
    if (!driverId) return 'Not assigned'
    const driver = drivers.find(d => d.id === driverId)
    return driver ? driver.name : 'Unknown driver'
  }

  // Get owner name by ID
  const getOwnerName = (ownerId: string | null | undefined) => {
    if (!ownerId) return 'No owner'
    const owner = owners.find(o => o.id === ownerId)
    return owner ? owner.name : 'Unknown owner'
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
        title="Car Management" 
        description="Manage your vehicle fleet, driver assignments, and owner assignments"
      >
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
                  <Label htmlFor="plate_number">Plate Number *</Label>
                  <Input
                    id="plate_number"
                    value={carForm.plate_number}
                    onChange={(e) => setCarForm({...carForm, plate_number: e.target.value})}
                    placeholder="Enter plate number"
                  />
                </div>
                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={carForm.model}
                    onChange={(e) => setCarForm({...carForm, model: e.target.value})}
                    placeholder="Enter car model"
                  />
                </div>
                <div>
                  <Label htmlFor="monthly_due">Monthly Due (AED) *</Label>
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
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">Assigned to Drivers</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Assigned to Owners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cars.filter(c => c.owner_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Cars with owners
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
            Manage your vehicle fleet, driver assignments, and owner assignments
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cars.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          car.assigned_driver_id 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getDriverName(car.assigned_driver_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          car.owner_id 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {getOwnerName(car.owner_id)}
                        </span>
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