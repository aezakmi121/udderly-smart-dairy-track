
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  selling_price: number;
}

interface Product {
  id: string;
  name: string;
  variants?: ProductVariant[];
}

interface DiscountFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDiscount: any;
  products: Product[] | undefined;
  onSubmit: (formData: {
    product_id: string;
    variant_id: string | null;
    discount_type: 'percentage' | 'amount';
    discount_value: number;
    is_active: boolean;
  }) => void;
  isLoading: boolean;
}

export const DiscountForm: React.FC<DiscountFormProps> = ({
  isOpen,
  onClose,
  selectedDiscount,
  products,
  onSubmit,
  isLoading
}) => {
  const [selectedProductId, setSelectedProductId] = useState(selectedDiscount?.product_id || '');
  const [selectedVariantId, setSelectedVariantId] = useState(selectedDiscount?.variant_id || 'all_variants');
  const [discountType, setDiscountType] = useState(selectedDiscount?.discount_type || 'amount');
  const [discountValue, setDiscountValue] = useState(selectedDiscount?.discount_value || 0);
  const [isActive, setIsActive] = useState(selectedDiscount?.is_active?.toString() || 'true');
  
  const selectedProduct = products?.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate required fields
    if (!selectedProductId || selectedProductId.trim() === '') {
      console.error('Product is required');
      return;
    }
    
    if (discountValue <= 0) {
      console.error('Discount value must be greater than 0');
      return;
    }
    
    // Prepare the form data
    const formData = {
      product_id: selectedProductId,
      variant_id: selectedVariantId === 'all_variants' ? null : selectedVariantId,
      discount_type: discountType as 'percentage' | 'amount',
      discount_value: Number(discountValue),
      is_active: isActive === 'true'
    };
    
    console.log('Submitting form data:', formData);
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedDiscount ? 'Edit Product Discount' : 'Add Product Discount'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="product_id">Product *</Label>
            <Select 
              value={selectedProductId}
              onValueChange={setSelectedProductId}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
            <div>
              <Label htmlFor="variant_id">Variant (Optional)</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Apply to all variants or select specific" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_variants">All Variants</SelectItem>
                  {selectedProduct.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name} - ₹{variant.selling_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="amount">Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discount_value">Discount Value *</Label>
              <Input
                id="discount_value"
                type="number"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="is_active">Status</Label>
            <Select value={isActive} onValueChange={setIsActive}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedDiscount ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
