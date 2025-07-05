
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerSelector } from '../CustomerSelector';

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
        </div>
      )}
    </div>
  );
};
