
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
import { Users, Plus, Edit2, Eye } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type Customer = Tables<'customers'>;
type CustomerInsert = TablesInsert<'customers'>;

export const CustomersManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canEdit, canDelete } = useUserPermissions();

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const customerMutation = useMutation({
    mutationFn: async (customerData: Partial<CustomerInsert>) => {
      if (selectedCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', selectedCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([customerData as CustomerInsert]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: `Customer ${selectedCustomer ? 'updated' : 'added'} successfully!` });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast({ 
        title: `Failed to ${selectedCustomer ? 'update' : 'add'} customer`, 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const generateCustomerCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `CUST${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const customerData: Partial<CustomerInsert> = {
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

    customerMutation.mutate(customerData);
  };

  const openDialog = (customer?: Customer) => {
    setSelectedCustomer(customer || null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Customers Management</h2>
        </div>
        {canEdit.customers && (
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
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={selectedCustomer?.name || ''}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      defaultValue={selectedCustomer?.phone_number || ''}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={selectedCustomer?.address || ''}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="area">Area</Label>
                    <Input
                      id="area"
                      name="area"
                      defaultValue={selectedCustomer?.area || ''}
                    />
                  </div>

                  <div>
                    <Label htmlFor="daily_quantity">Daily Quantity (Liters)</Label>
                    <Input
                      id="daily_quantity"
                      name="daily_quantity"
                      type="number"
                      step="0.1"
                      defaultValue={selectedCustomer?.daily_quantity || ''}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="delivery_time">Delivery Time</Label>
                    <Select name="delivery_time" defaultValue={selectedCustomer?.delivery_time || 'morning'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subscription_type">Subscription Type</Label>
                    <Select name="subscription_type" defaultValue={selectedCustomer?.subscription_type || 'daily'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="alternate">Alternate Days</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate_per_liter">Rate per Liter *</Label>
                    <Input
                      id="rate_per_liter"
                      name="rate_per_liter"
                      type="number"
                      step="0.01"
                      defaultValue={selectedCustomer?.rate_per_liter || ''}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="credit_limit">Credit Limit</Label>
                    <Input
                      id="credit_limit"
                      name="credit_limit"
                      type="number"
                      step="0.01"
                      defaultValue={selectedCustomer?.credit_limit || ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select name="is_active" defaultValue={selectedCustomer?.is_active?.toString() || 'true'}>
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
                  <Button type="submit" disabled={customerMutation.isPending}>
                    {customerMutation.isPending ? 'Saving...' : (selectedCustomer ? 'Update' : 'Add')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Daily Qty</TableHead>
                  <TableHead>Rate/L</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.customer_code}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone_number}</TableCell>
                    <TableCell>{customer.area || 'Not specified'}</TableCell>
                    <TableCell>{customer.daily_quantity}L</TableCell>
                    <TableCell>₹{customer.rate_per_liter}</TableCell>
                    <TableCell>
                      <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(customer)}
                          disabled={!canEdit.customers}
                        >
                          {canEdit.customers ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

