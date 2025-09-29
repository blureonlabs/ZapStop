'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Plus, Car, Users, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  documents: any;
  document_expiry_date: string;
  created_at: string;
  updated_at: string;
  total_cars: number;
  cars: Array<{
    id: string;
    plate_number: string;
    model: string;
    monthly_due: number;
    assigned_driver_id: string;
    assigned_at: string;
  }>;
}

interface Car {
  id: string;
  plate_number: string;
  model: string;
  monthly_due: number;
  assigned_driver_id: string;
  users?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function OwnersPage() {
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
    password: '',
    phone: '',
    address: '',
    document_expiry_date: ''
  });
  const [selectedCars, setSelectedCars] = useState<string[]>([]);
  const [carsLoading, setCarsLoading] = useState(false);

  // Fetch owners data
  const fetchOwners = async () => {
    try {
      const response = await fetch('/api/owners', { cache: 'no-store' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        toast.error(errorData.error || `Failed to fetch owners (${response.status})`);
        return;
      }

      const data = await response.json();
      setOwners(data.owners || []);
    } catch (error) {
      console.error('Error fetching owners:', error);
      toast.error('Network error: Failed to fetch owners');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available cars
  const fetchCars = async (excludeOwnerId?: string) => {
    setCarsLoading(true);
    try {
      const url = excludeOwnerId ? `/api/cars?excludeOwnerId=${excludeOwnerId}` : '/api/cars';
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        toast.error(errorData.error || `Failed to fetch cars (${response.status})`);
        return;
      }

      const data = await response.json();
      setCars(data.cars || []);
    } catch (error) {
      console.error('Error fetching cars:', error);
      toast.error('Network error: Failed to fetch cars');
    } finally {
      setCarsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
    fetchCars();
  }, []);

  // Calculate statistics
  const totalOwners = owners.length;
  const ownersWithCars = owners.filter(owner => owner.total_cars > 0).length;
  const totalCarsAssigned = owners.reduce((sum, owner) => sum + owner.total_cars, 0);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingOwner ? `/api/owners/${editingOwner.id}` : '/api/owners';
      const method = editingOwner ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        toast.error(errorData.error || `Failed to save owner (${response.status})`);
        return;
      }

      const data = await response.json();
      toast.success(editingOwner ? 'Owner updated successfully' : 'Owner created successfully');
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingOwner(null);
      setFormData({ name: '', email: '', password: '', phone: '', address: '', document_expiry_date: '' });
      fetchOwners();
    } catch (error) {
      console.error('Error saving owner:', error);
      toast.error('Network error: Failed to save owner');
    }
  };

  // Handle delete owner
  const handleDeleteOwner = async (ownerId: string) => {
    if (!confirm('Are you sure you want to delete this owner?')) return;

    try {
      const response = await fetch(`/api/owners/${ownerId}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Owner deleted successfully');
        fetchOwners();
      } else {
        toast.error(data.error || 'Failed to delete owner');
      }
    } catch (error) {
      console.error('Error deleting owner:', error);
      toast.error('Failed to delete owner');
    }
  };

  // Handle assign cars
  const handleAssignCars = async () => {
    if (!selectedOwner || selectedCars.length === 0) return;

    try {
      const response = await fetch(`/api/owners/${selectedOwner.id}/cars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ carIds: selectedCars }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        setIsAssignDialogOpen(false);
        setSelectedCars([]);
        fetchOwners();
      } else {
        toast.error(data.error || 'Failed to assign cars');
      }
    } catch (error) {
      console.error('Error assigning cars:', error);
      toast.error('Failed to assign cars');
    }
  };

  // Handle remove car assignment
  const handleRemoveCar = async (ownerId: string, carId: string) => {
    if (!confirm('Are you sure you want to remove this car assignment?')) return;

    try {
      const response = await fetch(`/api/owners/${ownerId}/cars/${carId}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Car assignment removed successfully');
        fetchOwners();
      } else {
        toast.error(data.error || 'Failed to remove car assignment');
      }
    } catch (error) {
      console.error('Error removing car assignment:', error);
      toast.error('Failed to remove car assignment');
    }
  };

  // Open edit dialog
  const openEditDialog = (owner: Owner) => {
    setEditingOwner(owner);
    setFormData({
      name: owner.name,
      email: owner.email,
      password: '', // Don't populate password for editing
      phone: owner.phone || '',
      address: owner.address || '',
      document_expiry_date: owner.document_expiry_date || ''
    });
    setIsEditDialogOpen(true);
  };

  // Open assign cars dialog
  const openAssignDialog = (owner: Owner) => {
    setSelectedOwner(owner);
    setSelectedCars([]);
    setIsAssignDialogOpen(true);
    // Fetch cars excluding those already assigned to this owner
    fetchCars(owner.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading owners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Owner Management</h1>
          <p className="text-gray-600">Manage car owners and their assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Owner</DialogTitle>
              <DialogDescription>
                Create a new car owner account
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Enter password for owner login"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="document_expiry_date">Document Expiry Date</Label>
                <Input
                  id="document_expiry_date"
                  type="date"
                  value={formData.document_expiry_date}
                  onChange={(e) => setFormData({ ...formData, document_expiry_date: e.target.value })}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Owner</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOwners}</div>
            <p className="text-xs text-muted-foreground">Registered owners</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owners with Cars</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ownersWithCars}</div>
            <p className="text-xs text-muted-foreground">Owners with assigned cars</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars Assigned</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCarsAssigned}</div>
            <p className="text-xs text-muted-foreground">Cars assigned to owners</p>
          </CardContent>
        </Card>
      </div>

      {/* Owners Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Owners</CardTitle>
          <CardDescription>Manage owner accounts and car assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAME</TableHead>
                <TableHead>EMAIL</TableHead>
                <TableHead>PHONE</TableHead>
                <TableHead>ASSIGNED CARS</TableHead>
                <TableHead>CREATED</TableHead>
                <TableHead>ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {owners.map((owner) => (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                  <TableCell>{owner.email}</TableCell>
                  <TableCell>{owner.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {owner.cars && owner.cars.length > 0 ? (
                        owner.cars.map((car) => (
                          <div key={car.id} className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {car.plate_number}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveCar(owner.id, car.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">No cars assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(owner.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(owner)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openAssignDialog(owner)}
                      >
                        <Car className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteOwner(owner.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Owner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Owner</DialogTitle>
            <DialogDescription>
              Update owner information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                minLength={6}
                placeholder="Enter new password (optional)"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-document_expiry_date">Document Expiry Date</Label>
              <Input
                id="edit-document_expiry_date"
                type="date"
                value={formData.document_expiry_date}
                onChange={(e) => setFormData({ ...formData, document_expiry_date: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Owner</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Cars Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Cars to {selectedOwner?.name}</DialogTitle>
            <DialogDescription>
              Select cars to assign to this owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Currently Assigned Cars */}
            {selectedOwner && selectedOwner.cars && selectedOwner.cars.length > 0 && (
              <div>
                <Label>Currently Assigned Cars</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 mt-2 p-3 bg-gray-50 rounded-md">
                  {selectedOwner.cars.map((car) => (
                    <div key={car.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{car.plate_number}</span>
                        <span className="text-gray-500 ml-2">- {car.model}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveCar(selectedOwner.id, car.id)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Cars */}
            <div>
              <Label>Available Cars</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                {carsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading cars...</span>
                  </div>
                ) : cars.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <p>No cars available</p>
                    <p className="text-sm">All cars are already assigned to owners</p>
                  </div>
                ) : (
                  cars.map((car) => (
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
                      />
                      <label htmlFor={`car-${car.id}`} className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{car.plate_number}</span>
                          <span className="text-sm text-gray-500">{car.model}</span>
                        </div>
                        {car.users && (
                          <div className="text-xs text-gray-400">
                            Driver: {car.users.name}
                          </div>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignCars} disabled={selectedCars.length === 0}>
                Assign {selectedCars.length} Car{selectedCars.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
