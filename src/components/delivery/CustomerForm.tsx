
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCustomers } from '@/hooks/useCustomers';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';

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
  const { generateCustomerCode } = useCustomers();
  const { schemes } = useMilkSchemes();

  const selectedScheme = schemes?.find(s => s.id === selectedCustomer?.scheme_id);

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <Label htmlFor="delivery_time" className="text-sm">Delivery Time</Label>
            <Select name="delivery_time" defaultValue={selectedCustomer?.delivery_time || 'morning'}>
              <SelectTrigger className="h-8">
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
            <Label htmlFor="milk_type" className="text-sm">Milk Type</Label>
            <Select name="milk_type" defaultValue={selectedCustomer?.milk_type || 'cow'}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cow">Cow</SelectItem>
                <SelectItem value="buffalo">Buffalo</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="subscription_type" className="text-sm">Subscription Type</Label>
            <Select name="subscription_type" defaultValue={selectedCustomer?.subscription_type || 'daily'}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="alternate">Alternate Days</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rate_per_liter" className="text-sm">Rate per Liter (₹) *</Label>
            <Input
              id="rate_per_liter"
              name="rate_per_liter"
              type="number"
              step="0.01"
              defaultValue={selectedCustomer?.rate_per_liter || (selectedScheme ? 
                (selectedCustomer?.milk_type === 'buffalo' ? selectedScheme.buffalo_milk_rate : selectedScheme.cow_milk_rate) : 50)}
              required
              className="h-8"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="scheme_id" className="text-sm">Pricing Scheme</Label>
          <Select name="scheme_id" defaultValue={selectedCustomer?.scheme_id || 'none'}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Scheme</SelectItem>
              {schemes?.filter(s => s.is_active).map((scheme) => (
                <SelectItem key={scheme.id} value={scheme.id}>
                  {scheme.scheme_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedScheme && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 text-sm">Selected Scheme Details</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Cow Milk: ₹{selectedScheme.cow_milk_rate}/L</div>
              <div>Buffalo Milk: ₹{selectedScheme.buffalo_milk_rate}/L</div>
            </div>
            {selectedScheme.discount_value > 0 && (
              <Badge className="mt-2 text-xs">
                {selectedScheme.discount_value}
                {selectedScheme.discount_type === 'percentage' ? '%' : '₹'} Discount
              </Badge>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="credit_limit" className="text-sm">Credit Limit (₹)</Label>
          <Input
            id="credit_limit"
            name="credit_limit"
            type="number"
            step="0.01"
            defaultValue={selectedCustomer?.credit_limit || 0}
            className="h-8"
          />
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
