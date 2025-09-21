'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { attendanceAPI } from '@/lib/edge-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, RefreshCw, MapPin, Clock, Car, User } from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/ui/page-header'
import { dataCache } from '@/lib/dataCache'
import { PerformanceMonitor } from '@/lib/performance'

interface Attendance {
  id: string
  driver_id: string
  date: string
  start_time: string
  end_time: string | null
  status: string
  driver?: {
    id: string
    name: string
    email: string
  }
  car?: {
    id: string
    plate_number: string
    model: string
  }
}

export default function ActiveDriversPage() {
  const { appUser } = useAuth()
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchActiveDrivers = useCallback(async () => {
    if (!appUser || appUser.role !== 'admin') return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      console.log('Fetching active drivers for date:', today)
      
      // First, get attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .eq('status', 'present')
        .is('end_time', null)

      if (attendanceError) {
        console.error('Attendance error:', attendanceError)
        throw new Error(`Attendance error: ${attendanceError.message}`)
      }

      console.log('Attendance data:', attendanceData)

      // Get driver and car data for each attendance record
      const enrichedData = await Promise.all(
        (attendanceData || []).map(async (att) => {
          // Get driver info
          const { data: driverData } = await supabase
            .from('users')
            .select('id, name, email')
            .eq('id', att.driver_id)
            .single()

          // Get car info for this driver
          const { data: carData } = await supabase
            .from('cars')
            .select('id, plate_number, model')
            .eq('assigned_driver_id', att.driver_id)
            .single()

          return {
            ...att,
            driver: driverData,
            car: carData
          }
        })
      )

      setAttendance(enrichedData)
      console.log('Enriched data:', enrichedData)
    } catch (error) {
      console.error('Error fetching active drivers:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to fetch active drivers: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [appUser])

  const handleRefresh = async () => {
    setRefreshing(true)
    await PerformanceMonitor.measureAsync('active-drivers-refresh', fetchActiveDrivers)
    setRefreshing(false)
  }

  useEffect(() => {
    fetchActiveDrivers()
  }, [fetchActiveDrivers])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveDrivers()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchActiveDrivers])

  const activeDrivers = useMemo(() => {
    return attendance.map(att => {
      const startTime = new Date(`${att.date}T${att.start_time}`)
      const now = new Date()
      const workDuration = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60 * 60) * 10) / 10

      return {
        ...att,
        workDuration: workDuration > 0 ? workDuration : 0,
        start_time: att.start_time.substring(0, 5) // Format as HH:MM
      }
    })
  }, [attendance])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Active Drivers" 
          description="Monitor drivers currently on duty"
          icon={Users}
        />
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="w-16 h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Active Drivers" 
        description="Monitor drivers currently on duty"
        icon={Users}
      >
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid gap-6">
        {activeDrivers.length === 0 ? (
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-12 text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Active Drivers</h3>
              <p className="text-gray-500">No drivers are currently on duty</p>
            </CardContent>
          </Card>
        ) : (
          activeDrivers.map((driver) => (
            <Card key={driver.id} className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-semibold text-lg">
                        {driver.driver?.name?.charAt(0) || 'D'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {driver.driver?.name || 'Unknown Driver'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {driver.driver?.email || 'No email'}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Car className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {driver.car?.plate_number || 'No car assigned'}
                        </span>
                        {driver.car?.model && (
                          <span className="text-sm text-gray-500">
                            ({driver.car.model})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center text-green-600 mb-1">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="font-semibold">
                        {driver.workDuration}h
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Started: {driver.start_time}
                    </p>
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-2xl font-bold text-gray-900">{activeDrivers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Work Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeDrivers.length > 0 
                    ? Math.round(activeDrivers.reduce((sum, d) => sum + d.workDuration, 0) / activeDrivers.length * 10) / 10
                    : 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">With Cars</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeDrivers.filter(d => d.car?.plate_number).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
