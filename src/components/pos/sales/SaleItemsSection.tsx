
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { ProductSelector } from './ProductSelector';

interface SaleItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  discount?: number;
  total: number;
  fractionalAllowed: boolean;
}

interface ProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  selling_price: number;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
}

interface SaleItemsSectionProps {
  saleItems: SaleItem[];
  onAddItem: (product: Product, variant: ProductVariant) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
}

export const SaleItemsSection: React.FC<SaleItemsSectionProps> = ({
  saleItems,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem
}) => {
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  const handleProductSelect = (product: Product, variant: ProductVariant) => {
    try {
      onAddItem(product, variant);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleQuantityChange = (item: SaleItem, increment: boolean) => {
    try {
      const step = item.fractionalAllowed ? 0.1 : 1;
      const newQuantity = increment 
        ? item.quantity + step 
        : Math.max(item.fractionalAllowed ? 0.1 : 1, item.quantity - step);
      
      const finalQuantity = item.fractionalAllowed 
        ? parseFloat(newQuantity.toFixed(1))
        : Math.round(newQuantity);
      
      onUpdateQuantity(item.id, finalQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleDirectQuantityChange = (item: SaleItem, value: string) => {
    try {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        const finalValue = item.fractionalAllowed ? numValue : Math.round(numValue);
        onUpdateQuantity(item.id, finalValue);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Current Sale ({saleItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={() => setIsProductSelectorOpen(true)} 
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>

            {saleItems.length > 0 && (
              <div className="space-y-2">
                {saleItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price}/{item.unit}
                        {item.fractionalAllowed && (
                          <Badge variant="outline" className="ml-2 text-xs">Fractional</Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleQuantityChange(item, false)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleDirectQuantityChange(item, e.target.value)}
                        className="w-20 text-center"
                        step={item.fractionalAllowed ? "0.1" : "1"}
                        min={item.fractionalAllowed ? "0.1" : "1"}
                      />
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleQuantityChange(item, true)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="min-w-20">
                        ₹{item.total.toFixed(2)}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => onRemoveItem(item.id)}
                      >
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

      <ProductSelector
        open={isProductSelectorOpen}
        onOpenChange={setIsProductSelectorOpen}
        onSelectProduct={handleProductSelect}
      />
    </>
  );
};
