
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  onSelectProduct: (product: Product, variant: ProductVariant, customQuantity?: number) => void;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  open,
  onOpenChange,
  onSelectProduct
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
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
      if (product.fractional_allowed) {
        // For fractional products, show quantity dialog
        setSelectedProduct(product);
        setSelectedVariant(variant);
        setCustomQuantity(0.25); // Default to 250g
        setShowQuantityDialog(true);
      } else {
        // For non-fractional products, add directly
        onSelectProduct(product, variant);
        onOpenChange(false);
        setSearchTerm('');
      }
    } catch (error) {
      console.error('Error selecting product variant:', error);
    }
  };

  const handleConfirmQuantity = () => {
    if (selectedProduct && selectedVariant && customQuantity > 0) {
      onSelectProduct(selectedProduct, selectedVariant, customQuantity);
      setShowQuantityDialog(false);
      onOpenChange(false);
      setSearchTerm('');
      setSelectedProduct(null);
      setSelectedVariant(null);
      setCustomQuantity(1);
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
    <>
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

      {/* Quantity Dialog for Fractional Products */}
      <Dialog open={showQuantityDialog} onOpenChange={setShowQuantityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Quantity</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Product: {selectedProduct?.name}</Label>
              <p className="text-sm text-muted-foreground">
                Price: ₹{selectedVariant?.selling_price} per {selectedVariant?.unit}
              </p>
            </div>
            
            <div>
              <Label htmlFor="quantity">Quantity ({selectedVariant?.unit})</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={customQuantity}
                onChange={(e) => setCustomQuantity(parseFloat(e.target.value) || 0)}
                placeholder="Enter quantity (e.g., 0.25 for 250g)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total: ₹{((selectedVariant?.selling_price || 0) * customQuantity).toFixed(2)}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowQuantityDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmQuantity}
                disabled={customQuantity <= 0}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
