
import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BillSummarySection } from './BillSummarySection';
import { PaymentSection } from './PaymentSection';

interface CartActionsProps {
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  paymentMode: string;
  selectedCustomer: string;
  onPaymentModeChange: (mode: string) => void;
  onCustomerSelect: (customerId: string) => void;
  onProcessSale: () => void;
  onClearAll: () => void;
  hasItems: boolean;
}

export const CartActions: React.FC<CartActionsProps> = ({
  subtotal,
  totalDiscount,
  grandTotal,
  paymentMode,
  selectedCustomer,
  onPaymentModeChange,
  onCustomerSelect,
  onProcessSale,
  onClearAll,
  hasItems
}) => {
  if (!hasItems) return null;

  return (
    <div className="border-t p-4 space-y-4 bg-gray-50/50">
      <BillSummarySection 
        subtotal={subtotal}
        totalDiscount={totalDiscount}
        otherCharges={0}
        grandTotal={grandTotal}
      />
      
      <Separator />
      
      <PaymentSection 
        paymentMode={paymentMode}
        selectedCustomer={selectedCustomer}
        onPaymentModeChange={onPaymentModeChange}
        onCustomerSelect={onCustomerSelect}
        onProcessSale={onProcessSale}
        onClearAll={onClearAll}
      />
      
      <Button 
        onClick={onProcessSale}
        className="w-full" 
        size="lg"
        disabled={!hasItems || !paymentMode}
      >
        Complete Sale - ₹{grandTotal.toFixed(2)}
      </Button>
    </div>
  );
};
