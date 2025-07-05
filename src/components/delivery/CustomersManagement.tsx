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
  scheme_id: string | null;
  milk_type: string;
  created_at: string;
  updated_at: string;
  current_credit: number;
  last_payment_date: string | null;
}

export const CustomersManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleBulkDelete = (customerIds: string[]) => {
    // Implementation for bulk delete
    console.log('Bulk delete:', customerIds);
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
        {canEdit && (
          <div className="flex gap-2">
            <CustomerBulkUpload />
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
                  customer={editingCustomer}
                  onSubmit={(customerData) => {
                    customerMutation.mutate({
                      customerData,
                      isUpdate: !!editingCustomer,
                      id: editingCustomer?.id
                    });
                    setIsDialogOpen(false);
                  }}
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
          canEdit={canEdit}
        />
      </div>
    </div>
  );
};
