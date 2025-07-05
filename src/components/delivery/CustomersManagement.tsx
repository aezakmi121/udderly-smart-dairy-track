import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCustomers } from '@/hooks/useCustomers';
import { CustomerForm } from './CustomerForm';
import { CustomersTable } from './CustomersTable';
import { CustomerBulkUpload } from './CustomerBulkUpload';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone_number: string;
  address: string;
  area: string | null;
  daily_quantity: number;
  delivery_time: string;
  subscription_type: string;
  rate_per_liter: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CustomersManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { canEdit } = useUserPermissions();
  const { customers, isLoading, customerMutation, generateCustomerCode } = useCustomers();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerData = {
      customer_code: selectedCustomer?.customer_code || generateCustomerCode(),
      name: formData.get('name') as string,
      phone_number: formData.get('phone_number') as string,
      address: formData.get('address') as string,
      area: formData.get('area') as string || null,
      daily_quantity: parseFloat(formData.get('daily_quantity') as string) || 0,
      delivery_time: formData.get('delivery_time') as string || 'morning',
      subscription_type: formData.get('subscription_type') as string || 'daily',
      rate_per_liter: parseFloat(formData.get('rate_per_liter') as string),
      credit_limit: parseFloat(formData.get('credit_limit') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    customerMutation.mutate({
      customerData,
      isUpdate: !!selectedCustomer,
      id: selectedCustomer?.id
    });

    if (!customerMutation.isPending) {
      setIsDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  const openDialog = (customer?: Customer) => {
    setSelectedCustomer(customer || null);
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleBulkUploadComplete = () => {
    // This will trigger a re-fetch of customers data
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Customers Management</h2>
        </div>
        {canEdit.customers && (
          <div className="flex gap-2">
            <CustomerBulkUpload onUploadComplete={handleBulkUploadComplete} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </DialogTitle>
                </DialogHeader>
                
                <CustomerForm
                  selectedCustomer={selectedCustomer}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={customerMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading customers...</div>
          ) : customers?.length === 0 ? (
            <div className="text-center py-4">No customers found.</div>
          ) : (
            <CustomersTable
              customers={customers || []}
              onEdit={openDialog}
              canEdit={canEdit.customers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
