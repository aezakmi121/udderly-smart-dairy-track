
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Search } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useCustomers } from '@/hooks/useCustomers';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  scheme_id: string | null;
  milk_type: string;
  created_at: string;
  updated_at: string;
}

export const CustomersManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { canEdit } = useUserPermissions();
  const { customers, isLoading, customerMutation, generateCustomerCode } = useCustomers();
  const { schemes } = useMilkSchemes();
  const { toast } = useToast();

  // Filter customers based on search term
  const filteredCustomers = customers?.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone_number.includes(searchTerm) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const calculateRate = (milkType: string, schemeId: string | null) => {
    if (!schemeId || schemeId === 'none') {
      return milkType === 'cow' ? 60 : 75; // Default rates
    }
    
    const scheme = schemes?.find(s => s.id === schemeId);
    if (!scheme) return milkType === 'cow' ? 60 : 75;
    
    let baseRate = milkType === 'cow' ? scheme.cow_milk_rate : scheme.buffalo_milk_rate;
    
    if (scheme.discount_value > 0) {
      if (scheme.discount_type === 'percentage') {
        baseRate = baseRate - (baseRate * scheme.discount_value / 100);
      } else {
        baseRate = baseRate - scheme.discount_value;
      }
    }
    
    return Math.max(0, baseRate); // Ensure rate doesn't go negative
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const milkType = formData.get('milk_type') as string;
    const schemeId = formData.get('scheme_id') as string;
    const finalSchemeId = schemeId === 'none' ? null : schemeId;
    const calculatedRate = calculateRate(milkType, finalSchemeId);
    
    const customerData = {
      customer_code: selectedCustomer?.customer_code || generateCustomerCode(),
      name: formData.get('name') as string,
      phone_number: formData.get('phone_number') as string,
      address: formData.get('address') as string,
      area: formData.get('area') as string || null,
      daily_quantity: parseFloat(formData.get('daily_quantity') as string) || 0,
      delivery_time: formData.get('delivery_time') as string || 'morning',
      subscription_type: formData.get('subscription_type') as string || 'daily',
      rate_per_liter: parseFloat(formData.get('rate_per_liter') as string) || calculatedRate,
      credit_limit: parseFloat(formData.get('credit_limit') as string) || 0,
      is_active: formData.get('is_active') === 'true',
      scheme_id: finalSchemeId,
      milk_type: milkType
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

  const handleBulkDelete = async (customerIds: string[]) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', customerIds);
      
      if (error) throw error;
      
      toast({ title: `Successfully deleted ${customerIds.length} customer(s)` });
      
      // Refresh the customers list
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Failed to delete customers",
        description: error.message,
        variant: "destructive"
      });
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
          <h2 className="text-2xl font-bold">Customer Management</h2>
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

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Search Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, phone number, or customer code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Customers List 
            {searchTerm && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredCustomers.length} of {customers?.length || 0} customers)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-4">
              {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
            </div>
          ) : (
            <CustomersTable
              customers={filteredCustomers}
              onEdit={openDialog}
              onBulkDelete={handleBulkDelete}
              canEdit={canEdit.customers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
