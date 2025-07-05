
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';

interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  discount?: number;
  total: number;
}

interface SaleItemsSectionProps {
  saleItems: SaleItem[];
  onAddItem: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

export const SaleItemsSection: React.FC<SaleItemsSectionProps> = ({
  saleItems,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Current Sale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={onAddItem} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>

          {saleItems.length > 0 && (
            <div className="space-y-2">
              {saleItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">₹{item.price}/{item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, Math.max(0.1, item.quantity - 0.1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-16 text-center">{item.quantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 0.1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Badge variant="secondary">₹{item.total.toFixed(2)}</Badge>
                    <Button size="sm" variant="destructive" onClick={() => onRemoveItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
