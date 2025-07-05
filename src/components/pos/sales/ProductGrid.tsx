
import React from 'react';
import { ProductCard } from './ProductCard';

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

interface ProductGridProps {
  products: Product[];
  onSelectVariant: (product: Product, variant: ProductVariant) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onSelectVariant
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelectVariant={onSelectVariant}
        />
      ))}
    </div>
  );
};
