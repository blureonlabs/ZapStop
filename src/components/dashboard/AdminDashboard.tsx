'use client'

import { useState, useEffect } from 'react'
import { supabase, User, Car, DriverEarning, DriverExpense } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Car as CarIcon, TrendingUp, DollarSign, Receipt, Plus, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

export default function AdminDashboard() {
  const [drivers, setDrivers] = useState<User[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [earnings, setEarnings] = useState<DriverEarning[]>([])
  const [expenses, setExpenses] = useState<DriverExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [showDriverDialog, setShowDriverDialog] = useState(false)
  const [showCarDialog, setShowCarDialog] = useState(false)
  // const [editingDriver, setEditingDriver] = useState<User | null>(null)
  // const [editingCar, setEditingCar] = useState<Car | null>(null)

  // Form states
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'driver' as const,
    assigned_car_id: ''
  })

  const [carForm, setCarForm] = useState({
    plate_number: '',
    model: '',
    monthly_due: 7500,
    assigned_driver_id: ''
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
        .select(`
          *,
          users!cars_assigned_driver_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })

      // Fetch all earnings
      const { data: earningsData } = await supabase
        .from('driver_earnings')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('date', { ascending: false })

      // Fetch all expenses
      const { data: expensesData } = await supabase
        .from('driver_expenses')
        .select(`
          *,
          users!inner(name, email)
        `)
        .order('created_at', { ascending: false })

      setDrivers(usersData?.filter(u => u.role === 'driver') || [])
      setCars(carsData || [])
      setEarnings(earningsData || [])
      setExpenses(expensesData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDriver = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .insert([driverForm])

      if (error) throw error

      toast.success('Driver created successfully')
      setShowDriverDialog(false)
      setDriverForm({ name: '', email: '', phone: '', role: 'driver', assigned_car_id: '' })
      fetchData()
    } catch (error) {
      console.error('Error creating driver:', error)
      toast.error('Failed to create driver')
    }
  }

  const handleCreateCar = async () => {
    try {
      const { error } = await supabase
        .from('cars')
        .insert([carForm])

      if (error) throw error

      toast.success('Car created successfully')
      setShowCarDialog(false)
      setCarForm({ plate_number: '', model: '', monthly_due: 7500, assigned_driver_id: '' })
      fetchData()
    } catch (error) {
      console.error('Error creating car:', error)
      toast.error('Failed to create car')
    }
  }

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) return

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', driverId)

      if (error) throw error

      toast.success('Driver deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting driver:', error)
      toast.error('Failed to delete driver')
    }
  }

  const handleDeleteCar = async (carId: string) => {
    if (!confirm('Are you sure you want to delete this car?')) return

    try {
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', carId)

      if (error) throw error

      toast.success('Car deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting car:', error)
      toast.error('Failed to delete car')
    }
  }

  const getCompanyStats = () => {
    const totalCars = cars.length
    const totalMandatoryDues = totalCars * 7500
    const totalEarnings = earnings.reduce((sum, e) => 
      sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_cash, 0)
    const totalExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)
    const netProfit = totalEarnings - totalExpenses

    return { totalCars, totalMandatoryDues, totalEarnings, totalExpenses, netProfit }
  }

  const getCarLevelPL = () => {
    return cars.map(car => {
      const carEarnings = earnings.filter(e => {
        const driver = drivers.find(d => d.id === e.driver_id)
        return driver?.assigned_car_id === car.id
      }).reduce((sum, e) => 
        sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_cash, 0)
      
      const carExpenses = expenses.filter(e => {
        const driver = drivers.find(d => d.id === e.driver_id)
        return driver?.assigned_car_id === car.id && e.status === 'approved'
      }).reduce((sum, e) => sum + e.amount, 0)

      return {
        car: car.plate_number,
        earnings: carEarnings,
        expenses: carExpenses,
        net: carEarnings - carExpenses,
        due: car.monthly_due
      }
    })
  }

  const getDriverLevelPL = () => {
    return drivers.map(driver => {
      const driverEarnings = earnings.filter(e => e.driver_id === driver.id)
        .reduce((sum, e) => 
          sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_cash, 0)
      
      const driverExpenses = expenses.filter(e => e.driver_id === driver.id && e.status === 'approved')
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        driver: driver.name,
        earnings: driverEarnings,
        expenses: driverExpenses,
        net: driverEarnings - driverExpenses
      }
    })
  }

  const getEarningsByPlatform = () => {
    const uberEarnings = earnings.reduce((sum, e) => sum + e.uber_cash + e.uber_account, 0)
    const boltEarnings = earnings.reduce((sum, e) => sum + e.bolt_cash + e.bolt_account, 0)
    const individualEarnings = earnings.reduce((sum, e) => sum + e.individual_cash, 0)

    return [
      { name: 'Uber', value: uberEarnings, color: '#3b82f6' },
      { name: 'Bolt', value: boltEarnings, color: '#10b981' },
      { name: 'Individual', value: individualEarnings, color: '#f59e0b' }
    ]
  }

  const getDailyTrends = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last30Days.map(date => {
      const dayEarnings = earnings.filter(e => e.date === date)
        .reduce((sum, e) => 
          sum + e.uber_cash + e.uber_account + e.bolt_cash + e.bolt_account + e.individual_cash, 0)
      
      const dayExpenses = expenses.filter(e => e.date === date && e.status === 'approved')
        .reduce((sum, e) => sum + e.amount, 0)

      return {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        earnings: dayEarnings,
        expenses: dayExpenses,
        net: dayEarnings - dayExpenses
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const companyStats = getCompanyStats()
  const carLevelPL = getCarLevelPL()
  const driverLevelPL = getDriverLevelPL()
  const earningsByPlatform = getEarningsByPlatform()
  const dailyTrends = getDailyTrends()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Company KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyStats.totalCars}</div>
            <p className="text-xs text-muted-foreground">
              Active vehicles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Dues</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {companyStats.totalMandatoryDues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Monthly target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {companyStats.totalEarnings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${companyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              AED {companyStats.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              After expenses
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="cars">Cars</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings vs Dues vs Expenses Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Line type="monotone" dataKey="earnings" stroke="#3b82f6" name="Earnings" />
                    <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                    <Line type="monotone" dataKey="net" stroke="#10b981" name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uber vs Bolt vs Individual Split</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={earningsByPlatform}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {earningsByPlatform.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Car-Level P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={carLevelPL}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="car" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    <Bar dataKey="net" fill="#10b981" name="Net" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Driver-Level P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={driverLevelPL}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="driver" />
                    <YAxis />
                    <Tooltip formatter={(value) => `AED ${Number(value).toLocaleString()}`} />
                    <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    <Bar dataKey="net" fill="#10b981" name="Net" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Driver Management</h2>
            <Dialog open={showDriverDialog} onOpenChange={setShowDriverDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Driver
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Driver</DialogTitle>
                  <DialogDescription>
                    Create a new driver account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="driver_name">Name</Label>
                    <Input
                      id="driver_name"
                      value={driverForm.name}
                      onChange={(e) => setDriverForm({...driverForm, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="driver_email">Email</Label>
                    <Input
                      id="driver_email"
                      type="email"
                      value={driverForm.email}
                      onChange={(e) => setDriverForm({...driverForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="driver_phone">Phone</Label>
                    <Input
                      id="driver_phone"
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({...driverForm, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned_car">Assigned Car</Label>
                    <Select value={driverForm.assigned_car_id} onValueChange={(value) => setDriverForm({...driverForm, assigned_car_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a car" />
                      </SelectTrigger>
                      <SelectContent>
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

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Car</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {drivers.map((driver) => (
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
                          {cars.find(c => c.id === driver.assigned_car_id)?.plate_number || 'Not assigned'}
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cars" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Car Management</h2>
            <Dialog open={showCarDialog} onOpenChange={setShowCarDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Car
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Car</DialogTitle>
                  <DialogDescription>
                    Register a new vehicle
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="plate_number">Plate Number</Label>
                    <Input
                      id="plate_number"
                      value={carForm.plate_number}
                      onChange={(e) => setCarForm({...carForm, plate_number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={carForm.model}
                      onChange={(e) => setCarForm({...carForm, model: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_due">Monthly Due (AED)</Label>
                    <Input
                      id="monthly_due"
                      type="number"
                      value={carForm.monthly_due}
                      onChange={(e) => setCarForm({...carForm, monthly_due: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assigned_driver">Assigned Driver</Label>
                    <Select value={carForm.assigned_driver_id} onValueChange={(value) => setCarForm({...carForm, assigned_driver_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateCar} className="w-full">
                    Create Car
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Due</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Driver</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cars.map((car) => (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
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
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recovery Progress</CardTitle>
                <CardDescription>Progress towards monthly dues per car</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {carLevelPL.map((car, index) => {
                  const progress = Math.min((car.earnings / car.due) * 100, 100)
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{car.car}</span>
                        <span>{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>AED {car.earnings.toLocaleString()}</span>
                        <span>AED {car.due.toLocaleString()}</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      AED {companyStats.totalEarnings.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">Total Earnings</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      AED {companyStats.totalExpenses.toLocaleString()}
                    </div>
                    <div className="text-sm text-red-600">Total Expenses</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className={`text-3xl font-bold ${companyStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    AED {companyStats.netProfit.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Net Profit/Loss</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
