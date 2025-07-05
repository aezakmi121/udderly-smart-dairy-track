
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface CustomerFormProps {
  selectedCustomer: Customer | null;
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
  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : (selectedCustomer ? 'Update' : 'Add')}
        </Button>
      </div>
    </form>
  );
};
