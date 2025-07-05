
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CustomerSelector } from '../CustomerSelector';
import { useCustomers } from '@/hooks/useCustomers';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';

interface PaymentSectionProps {
  paymentMode: string;
  selectedCustomer: string;
  onPaymentModeChange: (mode: string) => void;
  onCustomerSelect: (customerId: string) => void;
  onProcessSale: () => void;
  onClearAll: () => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentMode,
  selectedCustomer,
  onPaymentModeChange,
  onCustomerSelect,
  onProcessSale,
  onClearAll
}) => {
  const { customers } = useCustomers();
  const { schemes } = useMilkSchemes();
  
  const selectedCustomerData = customers?.find(c => c.id === selectedCustomer);
  const customerScheme = selectedCustomerData?.scheme_id 
    ? schemes?.find(s => s.id === selectedCustomerData.scheme_id)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="payment_mode">Payment Mode</Label>
        <Select value={paymentMode} onValueChange={onPaymentModeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select payment mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {paymentMode === 'credit' && (
        <div>
          <Label>Customer</Label>
          <CustomerSelector
            selectedCustomerId={selectedCustomer}
            onCustomerSelect={onCustomerSelect}
          />
          
          {selectedCustomerData && customerScheme && (
            <div className="mt-2 p-2 bg-blue-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Applied Scheme:</span>
                <Badge variant="secondary">{customerScheme.scheme_name}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Product-specific discounts will be applied automatically
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
