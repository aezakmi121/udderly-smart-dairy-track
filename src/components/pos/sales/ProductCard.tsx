
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { Product, ProductVariant } from './types';

interface ProductCardProps {
  product: Product;
  onSelectVariant: (product: Product, variant: ProductVariant) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectVariant
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="h-5 w-5" />
          {product.name}
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant="secondary">{product.category}</Badge>
          {product.fractional_allowed && (
            <Badge variant="outline">Fractional</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Select Variant:
          </h4>
          <div className="grid gap-2">
            {product.variants.map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{variant.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({variant.size} {variant.unit})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-medium text-green-600">
                      ₹{variant.selling_price}
                    </span>
                    <Badge 
                      variant={variant.stock_quantity <= (variant.low_stock_alert || 0) ? "destructive" : "default"}
                      className="text-xs"
                    >
                      {variant.stock_quantity} left
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => onSelectVariant(product, variant)}
                  disabled={variant.stock_quantity <= 0}
                  className="ml-4"
                >
                  {variant.stock_quantity <= 0 ? 'Out of Stock' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
