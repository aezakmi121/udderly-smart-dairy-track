
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface LowStockAlertProps {
  lowStockItems: { product: any; variant: any }[];
}

export const LowStockAlert: React.FC<LowStockAlertProps> = ({ lowStockItems }) => {
  if (lowStockItems.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          Low Stock Alerts ({lowStockItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {lowStockItems.map(({ product, variant }) => (
            <div key={`${product.id}-${variant.id}`} className="flex justify-between items-center">
              <span>{product.name} - {variant.name}</span>
              <Badge variant="destructive">
                {variant.stock_quantity} left (Alert: {variant.low_stock_alert})
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
