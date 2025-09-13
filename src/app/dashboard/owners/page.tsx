'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBackendAuth } from '@/contexts/BackendAuthContext';
import { apiService, Owner, Car } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, Car as CarIcon, Users, Building2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function OwnersPage() {
  const { user, loading: authLoading } = useBackendAuth();
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Check authentication and permissions
  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, router]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (user && user.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600 mb-4">You don&apos;t have permission to access the owners management page.</p>
        <Button onClick={() => router.push('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ownersData, carsData] = await Promise.all([
        apiService.getOwners(),
        apiService.getCars()
      ]);
      
      console.log('Owners page - Owners data:', ownersData);
      console.log('Owners page - Cars data:', carsData);
      
      setOwners(ownersData || []);
      setCars(carsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Create new owner
  const handleCreateOwner = async () => {
    if (creating) return;
    
    try {
      setCreating(true);
      
      // Validate form data
      if (!formData.name.trim()) {
        toast.error('Owner name is required');
        return;
      }
      if (!formData.email.trim()) {
        toast.error('Email is required');
        return;
      }
      if (!formData.phone.trim()) {
        toast.error('Phone is required');
        return;
      }

      await apiService.createOwner(formData);
      
      toast.success('Owner created successfully!');
      setIsAddDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '' });
      fetchData();
    } catch (error: unknown) {
      console.error('Error creating owner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create owner'
      toast.error(errorMessage)
    } finally {
      setCreating(false);
    }
  };

  // Update existing owner
  const handleUpdateOwner = async () => {
    if (!editingOwner || updating) return;
    
    try {
      setUpdating(true);
      
      await apiService.updateOwner(editingOwner.id, formData);
      
      toast.success('Owner updated successfully!');
      setIsEditDialogOpen(false);
      setEditingOwner(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
      fetchData();
    } catch (error: unknown) {
      console.error('Error updating owner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update owner'
      toast.error(errorMessage)
    } finally {
      setUpdating(false);
    }
  };

  // Delete owner
  const handleDeleteOwner = async (ownerId: string) => {
    if (!confirm('Are you sure you want to delete this owner? This will unassign all their cars.')) return;

    try {
      await apiService.deleteOwner(ownerId);
      toast.success('Owner deleted successfully!');
      fetchData();
    } catch (error: unknown) {
      console.error('Error deleting owner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete owner'
      toast.error(errorMessage)
    }
  };

  // Assign cars to owner
  const handleAssignCars = async () => {
    if (!selectedOwner || selectedCars.length === 0 || assigning) return;

    try {
      setAssigning(true);
      
      // Assign each selected car to the owner
      for (const carId of selectedCars) {
        await apiService.assignCarToOwner(carId, selectedOwner.id);
      }
      
      toast.success('Cars assigned successfully!');
      setIsAssignDialogOpen(false);
      setSelectedCars([]);
      setSelectedOwner(null);
      fetchData();
    } catch (error: unknown) {
      console.error('Error assigning cars:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign cars'
      toast.error(errorMessage)
    } finally {
      setAssigning(false);
    }
  };

  // Unassign car from owner
  const handleUnassignCar = async (carId: string) => {
    if (!confirm('Are you sure you want to unassign this car from its owner?')) return;

    try {
      await apiService.unassignCarFromOwner(carId);
      toast.success('Car unassigned successfully!');
      fetchData();
    } catch (error: unknown) {
      console.error('Error unassigning car:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to unassign car'
      toast.error(errorMessage)
    }
  };

  // Open assign cars dialog
  const openAssignDialog = (owner: Owner) => {
    setSelectedOwner(owner);
    setSelectedCars([]);
    setIsAssignDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      address: owner.address || ''
    });
    setIsEditDialogOpen(true);
  };

  // Get available cars for assignment (cars without owners or already assigned to this owner)
  const getAvailableCars = () => {
    if (!selectedOwner) return [];
    
    return cars.filter(car => 
      !car.owner_id || car.owner_id === selectedOwner.id
    );
  };

  // Get cars assigned to a specific owner
  const getOwnerCars = (ownerId: string) => {
    return cars.filter(car => car.owner_id === ownerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owners Management</h1>
          <p className="text-gray-600 mt-1">Manage car owners and their vehicle assignments</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Owner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Owner</DialogTitle>
                <DialogDescription>
                  Create a new car owner account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Owner Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter owner name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Enter address (optional)"
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleCreateOwner} 
                  className="w-full"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Owner'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{owners.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered owners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owned Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Unassigned Cars</CardTitle>
            <CarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cars.filter(c => !c.owner_id).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Cars without owners
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Owners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Car Owners</CardTitle>
          <CardDescription>
            Manage car owners and their vehicle assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Cars</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      No owners found. Add your first owner to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  owners.map((owner) => {
                    const ownerCars = getOwnerCars(owner.id);
                    return (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">{owner.name}</TableCell>
                        <TableCell>{owner.email}</TableCell>
                        <TableCell>{owner.phone}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {ownerCars.length === 0 ? (
                              <span className="text-gray-400">No cars assigned</span>
                            ) : (
                              ownerCars.map((car) => (
                                <div key={car.id} className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs">
                                    {car.plate_number} - {car.model}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleUnassignCar(car.id)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(owner.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignDialog(owner)}
                            >
                              <CarIcon className="h-4 w-4 mr-1" />
                              Assign Cars
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(owner)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteOwner(owner.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Owner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Owner</DialogTitle>
            <DialogDescription>
              Update owner information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Owner Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter owner name"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Enter address (optional)"
                rows={3}
              />
            </div>
            <Button 
              onClick={handleUpdateOwner} 
              className="w-full"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Update Owner'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Cars Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Cars to {selectedOwner?.name}</DialogTitle>
            <DialogDescription>
              Select cars to assign to this owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Available Cars</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getAvailableCars().map((car) => (
                  <div key={car.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`car-${car.id}`}
                      checked={selectedCars.includes(car.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCars([...selectedCars, car.id]);
                        } else {
                          setSelectedCars(selectedCars.filter(id => id !== car.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`car-${car.id}`} className="text-sm">
                      {car.plate_number} - {car.model}
                      {car.owner_id === selectedOwner?.id && (
                        <span className="text-green-600 ml-2">(Currently assigned)</span>
                      )}
                    </label>
                  </div>
                ))}
                {getAvailableCars().length === 0 && (
                  <p className="text-gray-500 text-sm">No cars available for assignment</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignCars} 
                disabled={selectedCars.length === 0 || assigning}
              >
                {assigning ? 'Assigning...' : `Assign ${selectedCars.length} Car${selectedCars.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}