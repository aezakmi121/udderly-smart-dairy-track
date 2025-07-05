
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePOSData } from '@/hooks/usePOSData';
import { SearchBar } from './SearchBar';
import { CategorySection } from './CategorySection';
import { LoadingState, NoProductsState, NoSearchResultsState } from './EmptyStates';

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

interface ProductSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product, variant: ProductVariant) => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  open,
  onOpenChange,
  onSelectProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { products, productsLoading } = usePOSData();

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    if (!searchTerm.trim()) return products;
    
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.variants.some(variant => 
        variant.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [products, searchTerm]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    filteredProducts.forEach(product => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });

    return groups;
  }, [filteredProducts]);

  const handleSelectVariant = (product: Product, variant: ProductVariant) => {
    try {
      onSelectProduct(product, variant);
      onOpenChange(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Error selecting product variant:', error);
    }
  };

  const renderContent = () => {
    if (productsLoading) {
      return <LoadingState />;
    }

    if (!products || products.length === 0) {
      return <NoProductsState />;
    }

    if (Object.keys(groupedProducts).length === 0) {
      return <NoSearchResultsState />;
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
          <CategorySection
            key={category}
            category={category}
            products={categoryProducts}
            onSelectVariant={handleSelectVariant}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Product & Variant</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
