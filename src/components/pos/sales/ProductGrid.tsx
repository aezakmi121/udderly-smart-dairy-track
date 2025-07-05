
import React from 'react';
import { ProductCard } from './ProductCard';
import { Product, ProductVariant } from './types';

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
