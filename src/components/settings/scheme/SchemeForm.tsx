
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { usePOSData } from '@/hooks/usePOSData';

interface MilkScheme {
  id: string;
  scheme_name: string;
  cow_milk_rate: number;
  buffalo_milk_rate: number;
  discount_type: 'amount' | 'percentage';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductDiscount {
  product_id: string;
  variant_id?: string;
  discount_type: 'percentage' | 'amount';
  discount_value: number;
}

interface SchemeFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScheme: MilkScheme | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>, productDiscounts: ProductDiscount[]) => void;
  isLoading: boolean;
}

export const SchemeForm: React.FC<SchemeFormProps> = ({
  isOpen,
  onClose,
  selectedScheme,
  onSubmit,
  isLoading
}) => {
  const [productDiscounts, setProductDiscounts] = useState<ProductDiscount[]>([]);
  const { products, isLoading: productsLoading } = usePOSData();

  console.log('SchemeForm - Products:', products);
  console.log('SchemeForm - Loading:', productsLoading);

  useEffect(() => {
    if (!isOpen) {
      setProductDiscounts([]);
    }
  }, [isOpen]);

  const addProductDiscount = () => {
    setProductDiscounts([...productDiscounts, {
      product_id: '',
      variant_id: '',
      discount_type: 'percentage',
      discount_value: 0
    }]);
  };

  const removeProductDiscount = (index: number) => {
    setProductDiscounts(productDiscounts.filter((_, i) => i !== index));
  };

  const updateProductDiscount = (index: number, field: keyof ProductDiscount, value: any) => {
    const updated = [...productDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setProductDiscounts(updated);
  };

  const getProductVariants = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    return product?.variants || [];
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(e, productDiscounts);
  };

  const getSelectedProduct = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    console.log('Selected product for ID ', productId, ':', product);
    return product;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedScheme ? 'Edit Milk Scheme' : 'Add New Milk Scheme'}
          </DialogTitle>
          <DialogDescription>
            Configure pricing scheme for customer milk delivery with optional product discounts.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheme_name">Scheme Name *</Label>
              <Input
                id="scheme_name"
                name="scheme_name"
                defaultValue={selectedScheme?.scheme_name || ''}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select name="discount_type" defaultValue={selectedScheme?.discount_type || 'amount'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="discount_value">Discount Value</Label>
            <Input
              id="discount_value"
              name="discount_value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={selectedScheme?.discount_value || 0}
            />
          </div>

          {/* Product Discounts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Product Discounts (Optional)</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProductDiscount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product Discount
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedScheme ? 'Update Scheme' : 'Create Scheme')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
