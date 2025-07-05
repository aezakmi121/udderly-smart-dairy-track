
import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Product {
  id: string;
  name: string;
  category: string;
  variants: any[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
  created_at: string;
}

interface ProductFormHeaderProps {
  product?: Product | null;
}

export const ProductFormHeader: React.FC<ProductFormHeaderProps> = ({ product }) => {
  return (
    <DialogHeader>
      <DialogTitle>
        {product ? 'Edit Product' : 'Add New Product'}
      </DialogTitle>
    </DialogHeader>
  );
};
