
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Edit2, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  variants: any[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
  created_at: string;
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onEdit(product)}>
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onDelete(product)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
        <Badge variant="secondary">{product.category}</Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Unit Type:</span> {product.unit_type}
            {product.fractional_allowed && (
              <Badge variant="outline" className="ml-2">Fractional</Badge>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">Variants ({product.variants.length})</h4>
            <div className="space-y-2">
              {product.variants.map((variant) => (
                <div key={variant.id} className="text-sm p-2 bg-muted rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{variant.name}</span>
                    <Badge 
                      variant={variant.stock_quantity <= variant.low_stock_alert ? "destructive" : "default"}
                    >
                      {variant.stock_quantity} in stock
                    </Badge>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Size: {variant.size} {variant.unit} • 
                    {variant.cost_price && ` Cost: ₹${variant.cost_price} •`} 
                    Sell: ₹{variant.selling_price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
