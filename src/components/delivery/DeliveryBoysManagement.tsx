
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Plus, Users } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useDeliveryBoys } from '@/hooks/useDeliveryBoys';
import { DeliveryBoyForm } from './DeliveryBoyForm';
import { DeliveryBoysTable } from './DeliveryBoysTable';
import { CustomerAllocation } from './CustomerAllocation';
import { DeliveryBoyDashboard } from './DeliveryBoyDashboard';

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

export const DeliveryBoysManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState<DeliveryBoy | null>(null);
  const { canEdit } = useUserPermissions();
  const { deliveryBoys, isLoading, deliveryBoyMutation } = useDeliveryBoys();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const deliveryBoyData = {
      name: formData.get('name') as string,
      phone_number: formData.get('phone_number') as string,
      vehicle_type: formData.get('vehicle_type') as string,
      vehicle_number: formData.get('vehicle_number') as string,
      assigned_area: formData.get('assigned_area') as string,
      daily_capacity: parseFloat(formData.get('daily_capacity') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    deliveryBoyMutation.mutate({
      deliveryBoyData,
      isUpdate: !!selectedDeliveryBoy,
      id: selectedDeliveryBoy?.id
    });

    if (!deliveryBoyMutation.isPending) {
      setIsDialogOpen(false);
      setSelectedDeliveryBoy(null);
    }
  };

  const openDialog = (deliveryBoy?: DeliveryBoy) => {
    setSelectedDeliveryBoy(deliveryBoy || null);
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedDeliveryBoy(null);
  };

  // Check if user is a delivery boy
  const isDeliveryBoy = canEdit.deliveryBoys === false; // Assuming delivery boys can't edit delivery boys

  if (isDeliveryBoy) {
    return <DeliveryBoyDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Delivery Management</h2>
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
              
              <DeliveryBoyForm
                selectedDeliveryBoy={selectedDeliveryBoy}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={deliveryBoyMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="allocation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocation" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer Allocation
          </TabsTrigger>
          <TabsTrigger value="delivery-boys" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivery Boys
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="allocation">
          <CustomerAllocation />
        </TabsContent>
        
        <TabsContent value="delivery-boys">
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
                <DeliveryBoysTable
                  deliveryBoys={deliveryBoys || []}
                  onEdit={openDialog}
                  canEdit={canEdit.deliveryBoys}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
