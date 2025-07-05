
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ProductGrid } from './ProductGrid';

interface ProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  cost_price?: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
}

interface CategorySectionProps {
  category: string;
  products: Product[];
  onSelectVariant: (product: Product, variant: ProductVariant) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  products,
  onSelectVariant
}) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">{category}</h3>
        <Badge variant="outline">{products.length} products</Badge>
      </div>
      <ProductGrid products={products} onSelectVariant={onSelectVariant} />
    </div>
  );
};
