
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCustomers } from '@/hooks/useCustomers';
import { useDeliveryBoys } from '@/hooks/useDeliveryBoys';
import { useCustomerAllocations } from '@/hooks/useCustomerAllocations';
import { useDailyDeliveries } from '@/hooks/useDailyDeliveries';

export const CustomerAllocation = () => {
  const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  
  const { customers } = useCustomers();
  const { deliveryBoys } = useDeliveryBoys();
  const { allocations, allocateCustomer, removeAllocation } = useCustomerAllocations();
  const { generateDeliveries } = useDailyDeliveries();

  const handleBulkAllocate = () => {
    if (selectedCustomers.length > 0 && selectedDeliveryBoy) {
      selectedCustomers.forEach(customerId => {
        allocateCustomer.mutate({
          customerId,
          deliveryBoyId: selectedDeliveryBoy
        });
      });
      setSelectedCustomers([]);
      setSelectedDeliveryBoy('');
    }
  };

  const handleGenerateDeliveries = () => {
    generateDeliveries.mutate(undefined);
  };

  // Get only active customers
  const activeCustomers = customers.filter(customer => customer.is_active);

  // Get unallocated customers (active customers not in allocations)
  const unallocatedCustomers = activeCustomers.filter(customer => 
    !allocations.some(allocation => allocation.customer_id === customer.id && allocation.is_active)
  );

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(unallocatedCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

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

      {/* Allocation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Active Customers</p>
                <p className="text-2xl font-bold">{activeCustomers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Allocated Customers</p>
                <p className="text-2xl font-bold">{allocations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unallocated Customers</p>
                <p className="text-2xl font-bold">{unallocatedCustomers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unallocated Customers List */}
      {unallocatedCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Unallocated Customers ({unallocatedCustomers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedCustomers.length === unallocatedCustomers.length && unallocatedCustomers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="min-w-[200px]">
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
                  
                  <Button 
                    onClick={handleBulkAllocate}
                    disabled={selectedCustomers.length === 0 || !selectedDeliveryBoy || allocateCustomer.isPending}
                  >
                    {allocateCustomer.isPending ? 'Allocating...' : `Allocate Selected (${selectedCustomers.length})`}
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Daily Qty</TableHead>
                    <TableHead>Rate/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unallocatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.includes(customer.id)}
                          onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.customer_code}</TableCell>
                      <TableCell>{customer.phone_number}</TableCell>
                      <TableCell>{customer.area || 'Not specified'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.daily_quantity}L</Badge>
                      </TableCell>
                      <TableCell>₹{customer.rate_per_liter}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Allocations */}
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
                      Remove
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
