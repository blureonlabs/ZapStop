'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign, ArrowLeft, TrendingUp, Calendar, Filter, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface DriverEarning {
  id: string
  driver_id: string
  date: string
  uber_cash: number
  uber_account: number
  bolt_cash: number
  bolt_account: number
  individual_cash: number
  notes?: string
  created_at: string
  updated_at: string
}

export default function EarningsPage() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [earnings, setEarnings] = useState<DriverEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [averageDaily, setAverageDaily] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filteredEarnings, setFilteredEarnings] = useState<DriverEarning[]>([])

  // Helper function to calculate total earnings for a single day
  const calculateTotal = (earning: DriverEarning) => {
    return earning.uber_cash + earning.uber_account + earning.bolt_cash + earning.bolt_account + earning.individual_cash
  }

  useEffect(() => {
    if (appUser) {
      fetchEarnings()
    }
  }, [appUser])

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      const authUserId = appUser?.id

      if (!authUserId) return

      // Fetch all earnings (no limit for filtering)
      const { data: earningsData, error: earningsError } = await supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', authUserId)
        .order('date', { ascending: false })

      if (earningsError) {
        console.error('Error fetching earnings:', earningsError)
        toast.error('Failed to load earnings data')
      } else {
        setEarnings(earningsData || [])
        setFilteredEarnings(earningsData || [])
        
        // Calculate totals for all data
        const total = earningsData?.reduce((sum, earning) => sum + calculateTotal(earning), 0) || 0
        setTotalEarnings(total)
        setAverageDaily(earningsData?.length ? total / earningsData.length : 0)
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
      toast.error('Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...earnings]

    if (dateFrom) {
      filtered = filtered.filter(earning => earning.date >= dateFrom)
    }

    if (dateTo) {
      filtered = filtered.filter(earning => earning.date <= dateTo)
    }

    setFilteredEarnings(filtered)
    
    // Recalculate totals for filtered data
    const total = filtered.reduce((sum, earning) => sum + calculateTotal(earning), 0)
    setTotalEarnings(total)
    setAverageDaily(filtered.length ? total / filtered.length : 0)
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setFilteredEarnings(earnings)
    
    // Reset to original totals
    const total = earnings.reduce((sum, earning) => sum + calculateTotal(earning), 0)
    setTotalEarnings(total)
    setAverageDaily(earnings.length ? total / earnings.length : 0)
  }

  useEffect(() => {
    applyFilters()
  }, [dateFrom, dateTo, earnings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading earnings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Earnings History</h1>
            <p className="text-gray-600">Track your daily earnings over time</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Date Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter by Date Range</CardTitle>
            <CardDescription>
              Select a date range to view specific earnings periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={applyFilters} size="sm">
                  Apply Filter
                </Button>
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Filtered Results:</strong> {filteredEarnings.length} days of earnings
                  {dateFrom && ` from ${new Date(dateFrom).toLocaleDateString()}`}
                  {dateTo && ` to ${new Date(dateTo).toLocaleDateString()}`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {averageDaily.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEarnings.length}</div>
            <p className="text-xs text-muted-foreground">
              {dateFrom || dateTo ? 'Filtered period' : 'All time'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Earnings Breakdown</CardTitle>
          <CardDescription>
            Detailed view of your daily earnings from different platforms
            {dateFrom || dateTo ? ` (${filteredEarnings.length} days shown)` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEarnings.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {earnings.length === 0 ? 'No earnings recorded' : 'No earnings in selected period'}
              </h3>
              <p className="text-gray-600">
                {earnings.length === 0 
                  ? 'Start logging your daily earnings to see them here.'
                  : 'Try adjusting your date filter to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Uber Cash</TableHead>
                    <TableHead>Uber Account</TableHead>
                    <TableHead>Bolt Cash</TableHead>
                    <TableHead>Bolt Account</TableHead>
                    <TableHead>Individual</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEarnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="font-medium">
                        {new Date(earning.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>AED {earning.uber_cash.toFixed(2)}</TableCell>
                      <TableCell>AED {earning.uber_account.toFixed(2)}</TableCell>
                      <TableCell>AED {earning.bolt_cash.toFixed(2)}</TableCell>
                      <TableCell>AED {earning.bolt_account.toFixed(2)}</TableCell>
                      <TableCell>AED {earning.individual_cash.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        AED {calculateTotal(earning).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
