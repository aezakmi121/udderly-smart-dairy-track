
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Payment Mode</Label>
          <Select value={paymentMode} onValueChange={onPaymentModeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="debit_card">Debit Card</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="upi">Bhim/UPI</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentMode === 'credit' && (
          <div>
            <Label>Select Customer</Label>
            <CustomerSelector
              selectedCustomerId={selectedCustomer}
              onCustomerSelect={onCustomerSelect}
            />
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={onProcessSale} className="w-full" size="lg">
            Process Sale
          </Button>
          <Button onClick={onClearAll} variant="outline" className="w-full">
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
