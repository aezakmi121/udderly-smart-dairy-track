
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Package, Search, Check, ChevronsUpDown } from 'lucide-react';
import { usePOSData } from '@/hooks/usePOSData';
import { cn } from '@/lib/utils';

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
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  const { products, categories, productsLoading } = usePOSData();

  // Create flattened product-variant combinations for easier searching
  const productVariantOptions = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const options: Array<{
      id: string;
      label: string;
      product: Product;
      variant: ProductVariant;
      category: string;
      searchText: string;
    }> = [];

    products.forEach(product => {
      product.variants.forEach(variant => {
        const label = `${product.name} - ${variant.name} (${variant.size} ${variant.unit}) - ₹${variant.selling_price}`;
        const searchText = `${product.name} ${variant.name} ${product.category}`.toLowerCase();
        
        options.push({
          id: `${product.id}-${variant.id}`,
          label,
          product,
          variant,
          category: product.category,
          searchText
        });
      });
    });

    return options;
  }, [products]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return productVariantOptions;
    
    return productVariantOptions.filter(option =>
      option.searchText.includes(searchTerm.toLowerCase())
    );
  }, [productVariantOptions, searchTerm]);

  // Group filtered options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof filteredOptions> = {};
    
    filteredOptions.forEach(option => {
      if (!groups[option.category]) {
        groups[option.category] = [];
      }
      groups[option.category].push(option);
    });

    return groups;
  }, [filteredOptions]);

  const selectedOption = productVariantOptions.find(opt => opt.id === selectedProductId);

  const handleSelect = () => {
    if (!selectedOption) return;
    
    try {
      onSelectProduct(selectedOption.product, selectedOption.variant);
      onOpenChange(false);
      setSelectedProductId('');
      setSelectedVariantId('');
      setSearchTerm('');
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  };

  const handleReset = () => {
    setSelectedProductId('');
    setSelectedVariantId('');
    setSearchTerm('');
  };

  if (productsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Package className="h-8 w-8 mx-auto mb-2 animate-pulse" />
              <p>Loading products...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No products available.</p>
            <p className="text-sm">Please add products first.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Search & Select Product</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedOption ? selectedOption.label : "Select product..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                <Command>
                  <CommandInput 
                    placeholder="Search products..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList className="max-h-64">
                    <CommandEmpty>No products found.</CommandEmpty>
                    {Object.entries(groupedOptions).map(([category, options]) => (
                      <CommandGroup key={category} heading={category}>
                        {options.map((option) => (
                          <CommandItem
                            key={option.id}
                            value={option.id}
                            onSelect={(value) => {
                              setSelectedProductId(value === selectedProductId ? "" : value);
                              setComboboxOpen(false);
                            }}
                            disabled={option.variant.stock_quantity <= 0}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProductId === option.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={option.variant.stock_quantity <= 0 ? "line-through opacity-50" : ""}>
                                  {option.label}
                                </span>
                                <Badge 
                                  variant={option.variant.stock_quantity <= 0 ? "destructive" : "secondary"}
                                  className="ml-2"
                                >
                                  {option.variant.stock_quantity} left
                                </Badge>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedOption && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Selected Product Details</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Product:</strong> {selectedOption.product.name}</div>
                <div><strong>Category:</strong> {selectedOption.category}</div>
                <div><strong>Variant:</strong> {selectedOption.variant.name}</div>
                <div><strong>Size:</strong> {selectedOption.variant.size} {selectedOption.variant.unit}</div>
                <div><strong>Price:</strong> ₹{selectedOption.variant.selling_price}</div>
                <div><strong>Stock:</strong> {selectedOption.variant.stock_quantity} available</div>
                {selectedOption.product.fractional_allowed && (
                  <Badge variant="outline">Fractional quantities allowed</Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleReset}>
              Clear
            </Button>
            <Button 
              type="button" 
              onClick={handleSelect} 
              disabled={!selectedOption || selectedOption.variant.stock_quantity <= 0}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
