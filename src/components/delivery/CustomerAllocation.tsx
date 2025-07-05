import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, UserPlus } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useDeliveryBoys } from '@/hooks/useDeliveryBoys';
import { useCustomerAllocations } from '@/hooks/useCustomerAllocations';
import { useDailyDeliveries } from '@/hooks/useDailyDeliveries';

export const CustomerAllocation = () => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');
  
  const { customers } = useCustomers();
  const { deliveryBoys } = useDeliveryBoys();
  const { allocations, allocateCustomer, removeAllocation } = useCustomerAllocations();
  const { generateDeliveries } = useDailyDeliveries();

  const handleAllocate = () => {
    if (selectedCustomer && selectedDeliveryBoy) {
      allocateCustomer.mutate({
        customerId: selectedCustomer,
        deliveryBoyId: selectedDeliveryBoy
      });
      setSelectedCustomer('');
      setSelectedDeliveryBoy('');
    }
  };

  const handleGenerateDeliveries = () => {
    generateDeliveries.mutate(undefined);
  };

  const unallocatedCustomers = customers.filter(customer => 
    !allocations.some(allocation => allocation.customer_id === customer.id && allocation.is_active)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Allocation</h1>
          <p className="text-muted-foreground">Assign customers to delivery boys for milk delivery.</p>
        </div>
        <Button onClick={handleGenerateDeliveries} disabled={generateDeliveries.isPending}>
          <Users className="h-4 w-4 mr-2" />
          {generateDeliveries.isPending ? 'Generating...' : 'Generate Today\'s Deliveries'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Allocate Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Customer</label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  {unallocatedCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.customer_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Select Delivery Boy</label>
              <Select value={selectedDeliveryBoy} onValueChange={setSelectedDeliveryBoy}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose delivery boy" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryBoys.filter(boy => boy.is_active).map((boy) => (
                    <SelectItem key={boy.id} value={boy.id}>
                      {boy.name} - {boy.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleAllocate} 
                disabled={!selectedCustomer || !selectedDeliveryBoy || allocateCustomer.isPending}
                className="w-full"
              >
                {allocateCustomer.isPending ? 'Allocating...' : 'Allocate Customer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Daily Qty</TableHead>
                <TableHead>Delivery Boy</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="font-medium">
                    {allocation.customers.name}
                  </TableCell>
                  <TableCell>{allocation.customers.customer_code}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {allocation.customers.address}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {allocation.customers.daily_quantity}L
                    </Badge>
                  </TableCell>
                  <TableCell>{allocation.delivery_boys.name}</TableCell>
                  <TableCell>{allocation.delivery_boys.phone_number}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAllocation.mutate(allocation.id)}
                      disabled={removeAllocation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {allocations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No customer allocations found. Start by allocating customers to delivery boys.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
