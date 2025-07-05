
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, Search } from 'lucide-react';
import { usePOSData } from '@/hooks/usePOSData';

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
  const [selectedCategory, setSelectedCategory] = useState('');
  const { products, categories, productsLoading } = usePOSData();

  // Early return with loading state
  if (productsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="text-center py-4">Loading products...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // Early return if no products
  if (!products || products.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            No products available. Please add products first.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleVariantSelect = (product: Product, variant: ProductVariant) => {
    if (variant.stock_quantity <= 0) {
      return;
    }
    try {
      onSelectProduct(product, variant);
      onOpenChange(false);
      setSearchTerm('');
      setSelectedCategory('');
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Search Products</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  <h3 className="font-medium">{product.name}</h3>
                  <Badge variant="secondary">{product.category}</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Unit Type: {product.unit_type}
                    {product.fractional_allowed && (
                      <Badge variant="outline" className="ml-2">Fractional</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Variants:</Label>
                    {product.variants.map((variant) => (
                      <Button
                        key={variant.id}
                        variant={variant.stock_quantity <= 0 ? "secondary" : "outline"}
                        size="sm"
                        className="w-full justify-between text-xs"
                        onClick={() => handleVariantSelect(product, variant)}
                        disabled={variant.stock_quantity <= 0}
                      >
                        <span>{variant.name} - {variant.size} {variant.unit}</span>
                        <div className="flex items-center gap-2">
                          <span>₹{variant.selling_price}</span>
                          <Badge 
                            variant={variant.stock_quantity <= 0 ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {variant.stock_quantity} left
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No products found matching your criteria.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
