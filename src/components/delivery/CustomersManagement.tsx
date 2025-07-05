
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { CustomersTable } from './CustomersTable';
import { CustomerForm } from './CustomerForm';
import { CustomerBulkUpload } from './CustomerBulkUpload';
import { CustomerSearch } from './customers/CustomerSearch';
import { CustomerFilters } from './customers/CustomerFilters';

// Remove the local Customer interface - we'll use the one from useCustomers hook

export const CustomersManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [milkTypeFilter, setMilkTypeFilter] = useState('all');
  
  const { customers, isLoading, customerMutation } = useCustomers();
  const { canEdit } = useUserPermissions();

  const filteredCustomers = customers?.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone_number.includes(searchTerm) ||
                         customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && customer.is_active) ||
                         (statusFilter === 'inactive' && !customer.is_active);
    
    const matchesMilkType = milkTypeFilter === 'all' || customer.milk_type === milkTypeFilter;
    
    return matchesSearch && matchesStatus && matchesMilkType;
  }) || [];

  const openAddDialog = () => {
    setEditingCustomer(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (customer: any) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleBulkDelete = (customerIds: string[]) => {
    // Implementation for bulk delete
    console.log('Bulk delete:', customerIds);
  };

  const handleBulkUploadComplete = () => {
    // Refresh the customers list after bulk upload
    window.location.reload();
  };

  const handleCustomerSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerData = {
      name: formData.get('name') as string,
      phone_number: formData.get('phone_number') as string,
      address: formData.get('address') as string,
      area: formData.get('area') as string || null,
      daily_quantity: parseFloat(formData.get('daily_quantity') as string) || 0,
      delivery_time: formData.get('delivery_time') as string,
      subscription_type: formData.get('subscription_type') as string,
      rate_per_liter: parseFloat(formData.get('rate_per_liter') as string),
      credit_limit: parseFloat(formData.get('credit_limit') as string) || 0,
      is_active: formData.get('is_active') === 'true',
      scheme_id: formData.get('scheme_id') === 'none' ? null : formData.get('scheme_id') as string,
      milk_type: formData.get('milk_type') as string,
    };

    customerMutation.mutate({
      customerData,
      isUpdate: !!editingCustomer,
      id: editingCustomer?.id
    });
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">Manage customer information and delivery details.</p>
        </div>
        {canEdit.customers && (
          <div className="flex gap-2">
            <CustomerBulkUpload onUploadComplete={handleBulkUploadComplete} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </DialogTitle>
                </DialogHeader>
                <CustomerForm
                  selectedCustomer={editingCustomer}
                  onSubmit={handleCustomerSubmit}
                  onCancel={() => setIsDialogOpen(false)}
                  isLoading={customerMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <CustomerSearch searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        
        <CustomerFilters
          statusFilter={statusFilter}
          milkTypeFilter={milkTypeFilter}
          onStatusFilterChange={setStatusFilter}
          onMilkTypeFilterChange={setMilkTypeFilter}
          totalCount={customers?.length || 0}
          filteredCount={filteredCustomers.length}
        />

        <CustomersTable
          customers={filteredCustomers}
          onEdit={openEditDialog}
          onBulkDelete={handleBulkDelete}
          canEdit={canEdit.customers}
        />
      </div>
    </div>
  );
};
