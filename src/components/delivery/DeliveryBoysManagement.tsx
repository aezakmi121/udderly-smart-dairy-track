
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck, Plus, Edit2, Eye } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface DeliveryBoy {
  id: string;
  user_id?: string;
  name: string;
  phone_number: string;
  vehicle_type?: string;
  vehicle_number?: string;
  assigned_area?: string;
  daily_capacity: number;
  is_active: boolean;
  created_at: string;
}

interface DeliveryBoyInsert {
  user_id?: string;
  name: string;
  phone_number: string;
  vehicle_type?: string;
  vehicle_number?: string;
  assigned_area?: string;
  daily_capacity?: number;
  is_active?: boolean;
}

export const DeliveryBoysManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<DeliveryBoy | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit, canDelete } = useUserPermissions();

  const { data: deliveryBoys, isLoading } = useQuery({
    queryKey: ['delivery-boys'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('delivery_boys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DeliveryBoy[];
    }
  });

  const deliveryBoyMutation = useMutation({
    mutationFn: async (deliveryBoyData: Partial<DeliveryBoyInsert>) => {
      if (selectedDeliveryBoy) {
        const { error } = await (supabase as any)
          .from('delivery_boys')
          .update(deliveryBoyData)
          .eq('id', selectedDeliveryBoy.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('delivery_boys')
          .insert([deliveryBoyData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-boys'] });
      toast({ title: `Delivery boy ${selectedDeliveryBoy ? 'updated' : 'added'} successfully!` });
      setIsDialogOpen(false);
      setSelectedDeliveryBoy(null);
    },
    onError: (error: any) => {
      toast({ 
        title: `Failed to ${selectedDeliveryBoy ? 'update' : 'add'} delivery boy`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const deliveryBoyData: Partial<DeliveryBoyInsert> = {
      name: formData.get('name') as string,
      phone_number: formData.get('phone_number') as string,
      vehicle_type: formData.get('vehicle_type') as string,
      vehicle_number: formData.get('vehicle_number') as string,
      assigned_area: formData.get('assigned_area') as string,
      daily_capacity: parseFloat(formData.get('daily_capacity') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    deliveryBoyMutation.mutate(deliveryBoyData);
  };

  const openDialog = (deliveryBoy?: DeliveryBoy) => {
    setSelectedDeliveryBoy(deliveryBoy || null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Delivery Boys Management</h2>
        </div>
        {canEdit.deliveryBoys && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Delivery Boy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedDeliveryBoy ? 'Edit Delivery Boy' : 'Add New Delivery Boy'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={selectedDeliveryBoy?.name || ''}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    defaultValue={selectedDeliveryBoy?.phone_number || ''}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="vehicle_type">Vehicle Type</Label>
                  <Select name="vehicle_type" defaultValue={selectedDeliveryBoy?.vehicle_type || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="scooter">Scooter</SelectItem>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="vehicle_number">Vehicle Number</Label>
                  <Input
                    id="vehicle_number"
                    name="vehicle_number"
                    defaultValue={selectedDeliveryBoy?.vehicle_number || ''}
                  />
                </div>

                <div>
                  <Label htmlFor="assigned_area">Assigned Area</Label>
                  <Input
                    id="assigned_area"
                    name="assigned_area"
                    defaultValue={selectedDeliveryBoy?.assigned_area || ''}
                  />
                </div>

                <div>
                  <Label htmlFor="daily_capacity">Daily Capacity (Liters)</Label>
                  <Input
                    id="daily_capacity"
                    name="daily_capacity"
                    type="number"
                    step="0.1"
                    defaultValue={selectedDeliveryBoy?.daily_capacity || ''}
                  />
                </div>

                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select name="is_active" defaultValue={selectedDeliveryBoy?.is_active?.toString() || 'true'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={deliveryBoyMutation.isPending}>
                    {deliveryBoyMutation.isPending ? 'Saving...' : (selectedDeliveryBoy ? 'Update' : 'Add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Boys List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading delivery boys...</div>
          ) : deliveryBoys?.length === 0 ? (
            <div className="text-center py-4">No delivery boys found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryBoys?.map((deliveryBoy) => (
                  <TableRow key={deliveryBoy.id}>
                    <TableCell className="font-medium">{deliveryBoy.name}</TableCell>
                    <TableCell>{deliveryBoy.phone_number}</TableCell>
                    <TableCell>
                      {deliveryBoy.vehicle_type && deliveryBoy.vehicle_number 
                        ? `${deliveryBoy.vehicle_type} - ${deliveryBoy.vehicle_number}`
                        : 'Not specified'
                      }
                    </TableCell>
                    <TableCell>{deliveryBoy.assigned_area || 'Not assigned'}</TableCell>
                    <TableCell>{deliveryBoy.daily_capacity}L</TableCell>
                    <TableCell>
                      <Badge variant={deliveryBoy.is_active ? 'default' : 'secondary'}>
                        {deliveryBoy.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(deliveryBoy)}
                          disabled={!canEdit.deliveryBoys}
                        >
                          {canEdit.deliveryBoys ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
