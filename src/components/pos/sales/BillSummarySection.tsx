
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

interface BillSummarySectionProps {
  subtotal: number;
  totalDiscount: number;
  otherCharges: number;
  grandTotal: number;
}

export const BillSummarySection: React.FC<BillSummarySectionProps> = ({
  subtotal,
  totalDiscount,
  otherCharges,
  grandTotal
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-₹{totalDiscount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Other Charges:</span>
            <span>₹{otherCharges.toFixed(2)}</span>
          </div>
          <hr />
          <div className="flex justify-between font-bold text-lg">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
