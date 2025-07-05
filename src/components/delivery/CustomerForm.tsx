
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCustomers } from '@/hooks/useCustomers';

interface CustomerFormProps {
  selectedCustomer: any;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  selectedCustomer,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const { generateCustomerCode } = useCustomers();

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="customer_code" className="text-sm">Customer Code *</Label>
            <Input
              id="customer_code"
              name="customer_code"
              defaultValue={selectedCustomer?.customer_code || generateCustomerCode()}
              required
              readOnly={!!selectedCustomer}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="name" className="text-sm">Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={selectedCustomer?.name || ''}
              required
              className="h-8"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone_number" className="text-sm">Phone Number *</Label>
            <Input
              id="phone_number"
              name="phone_number"
              type="tel"
              defaultValue={selectedCustomer?.phone_number || ''}
              required
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="area" className="text-sm">Area</Label>
            <Input
              id="area"
              name="area"
              defaultValue={selectedCustomer?.area || ''}
              className="h-8"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="address" className="text-sm">Address *</Label>
          <Input
            id="address"
            name="address"
            defaultValue={selectedCustomer?.address || ''}
            required
            className="h-8"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="daily_quantity" className="text-sm">Daily Quantity (L)</Label>
            <Input
              id="daily_quantity"
              name="daily_quantity"
              type="number"
              step="0.1"
              defaultValue={selectedCustomer?.daily_quantity || 0}
              className="h-8"
            />
          </div>
          <div>
            <Label htmlFor="rate_per_liter" className="text-sm">Rate per Liter (₹) *</Label>
            <Input
              id="rate_per_liter"
              name="rate_per_liter"
              type="number"
              step="0.01"
              defaultValue={selectedCustomer?.rate_per_liter || 50}
              required
              className="h-8"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            name="is_active"
            defaultChecked={selectedCustomer?.is_active ?? true}
          />
          <Label htmlFor="is_active" className="text-sm">Active Customer</Label>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} size="sm">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} size="sm">
            {isLoading ? 'Saving...' : (selectedCustomer ? 'Update Customer' : 'Add Customer')}
          </Button>
        </div>
      </form>
    </div>
  );
};
