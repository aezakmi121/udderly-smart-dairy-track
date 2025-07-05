
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdditionalChargesSectionProps {
  discount: number;
  otherCharges: number;
  onDiscountChange: (discount: number) => void;
  onOtherChargesChange: (charges: number) => void;
}

export const AdditionalChargesSection: React.FC<AdditionalChargesSectionProps> = ({
  discount,
  otherCharges,
  onDiscountChange,
  onOtherChargesChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Charges & Discounts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Discount (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Other Charges (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={otherCharges}
              onChange={(e) => onOtherChargesChange(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
