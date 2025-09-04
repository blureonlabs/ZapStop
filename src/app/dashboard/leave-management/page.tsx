'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, LeaveRequest } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LeaveManagementPage() {
  const { appUser } = useAuth()
  const router = useRouter()
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (appUser?.role === 'admin') {
      fetchLeaveRequests()
    } else {
      router.push('/dashboard')
    }
  }, [appUser, router])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          users!leave_requests_driver_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching leave requests:', error)
        toast.error('Failed to load leave requests')
      } else {
        setLeaveRequests(data || [])
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error)
      toast.error('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!appUser?.id) return

    try {
      setProcessing(true)

      const response = await fetch(`/api/leave-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          admin_notes: adminNotes,
          approved_by: appUser.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update leave request')
      }

      toast.success(result.message || `Leave request ${status} successfully`)
      setShowDialog(false)
      setSelectedRequest(null)
      setAdminNotes('')
      fetchLeaveRequests()
    } catch (error: any) {
      console.error('Error updating leave request:', error)
      toast.error(error.message || 'Failed to update leave request')
    } finally {
      setProcessing(false)
    }
  }

  const openDialog = (request: LeaveRequest) => {
    setSelectedRequest(request)
    setAdminNotes(request.admin_notes || '')
    setShowDialog(true)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getLeaveTypeColor = (type: string) => {
    const colors = {
      sick: 'bg-red-100 text-red-800',
      personal: 'bg-blue-100 text-blue-800',
      vacation: 'bg-green-100 text-green-800',
      emergency: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || colors.other
  }

  const filteredRequests = statusFilter === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(req => req.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leave requests...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600">Review and manage driver leave requests</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.filter(req => req.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.filter(req => req.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Approved requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.filter(req => req.status === 'rejected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Rejected requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            Review and approve or reject driver leave requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {statusFilter === 'all' ? 'No leave requests' : `No ${statusFilter} requests`}
              </h3>
              <p className="text-gray-600">
                {statusFilter === 'all' 
                  ? 'No leave requests have been submitted yet.' 
                  : `No ${statusFilter} leave requests found.`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const startDate = new Date(request.start_date)
                    const endDate = new Date(request.end_date)
                    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{request.users?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{request.users?.email || 'No email'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getLeaveTypeColor(request.leave_type)}>
                            {request.leave_type.charAt(0).toUpperCase() + request.leave_type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {startDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {endDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          {duration} day{duration !== 1 ? 's' : ''}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(request.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(request.status)}
                              <span>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {request.reason}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDialog(request)}
                            >
                              Review
                            </Button>
                          ) : (
                            <div className="text-sm text-gray-500">
                              {request.admin_notes ? 'Reviewed' : 'No notes'}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
            <DialogDescription>
              Review the leave request details and provide your decision.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Driver</Label>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.users?.name} ({selectedRequest.users?.email})
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Leave Type</Label>
                  <p className="text-sm text-gray-600 capitalize">{selectedRequest.leave_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedRequest.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded-md">
                  {selectedRequest.reason}
                </p>
              </div>

              <div>
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  placeholder="Add any notes or comments for the driver..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleStatusChange(selectedRequest.id, 'rejected')}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Reject'}
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedRequest.id, 'approved')}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Approve'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
