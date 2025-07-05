
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
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
  const { products, productsLoading } = usePOSData();
  const [productDiscounts, setProductDiscounts] = useState<ProductDiscount[]>([]);

  console.log('SchemeForm - Products:', products);
  console.log('SchemeForm - Loading:', productsLoading);

  useEffect(() => {
    if (!isOpen) {
      setProductDiscounts([]);
    }
  }, [isOpen]);

  const addProductDiscount = () => {
    console.log('Adding product discount');
    setProductDiscounts([...productDiscounts, {
      product_id: '',
      variant_id: undefined,
      discount_type: 'percentage',
      discount_value: 0
    }]);
  };

  const removeProductDiscount = (index: number) => {
    console.log('Removing product discount at index:', index);
    setProductDiscounts(productDiscounts.filter((_, i) => i !== index));
  };

  const updateProductDiscount = (index: number, field: keyof ProductDiscount, value: any) => {
    console.log('Updating product discount:', index, field, value);
    const updated = [...productDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setProductDiscounts(updated);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Submitting form with product discounts:', productDiscounts);
    onSubmit(e, productDiscounts);
    setProductDiscounts([]);
  };

  const getSelectedProduct = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    console.log('Selected product for ID', productId, ':', product);
    return product;
  };

  const handleProductSelect = (index: number, productId: string) => {
    console.log('Product selected:', productId);
    updateProductDiscount(index, 'product_id', productId);
    // Reset variant when product changes
    updateProductDiscount(index, 'variant_id', undefined);
  };

  const handleVariantSelect = (index: number, variantId: string) => {
    console.log('Variant selected:', variantId);
    updateProductDiscount(index, 'variant_id', variantId === 'all_variants' ? undefined : variantId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedScheme ? 'Edit Scheme' : 'Add New Scheme'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="scheme_name">Scheme Name *</Label>
            <Input
              id="scheme_name"
              name="scheme_name"
              defaultValue={selectedScheme?.scheme_name || ''}
              placeholder="Enter scheme name (e.g., Premium Customer Discount)"
              required
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Discounts</CardTitle>
                <p className="text-sm text-muted-foreground">Configure discounts for specific products</p>
              </div>
              <Button type="button" onClick={addProductDiscount} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product Discount
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {productsLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading products...</p>
                </div>
              )}
              
              {!productsLoading && (!products || products.length === 0) && (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                  <p className="text-muted-foreground">
                    No products available. Please add products in the POS Products section first.
                  </p>
                </div>
              )}

              {!productsLoading && products && products.length > 0 && productDiscounts.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                  <p className="text-muted-foreground">
                    No product discounts added yet. Click "Add Product Discount" to get started.
                  </p>
                </div>
              )}

              {productDiscounts.map((discount, index) => (
                <div key={index} className="grid grid-cols-5 gap-3 items-end p-4 border rounded-lg bg-muted/20">
                  <div>
                    <Label className="text-sm font-medium">Product *</Label>
                    <Select 
                      value={discount.product_id || ''} 
                      onValueChange={(value) => handleProductSelect(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
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

                  <div>
                    <Label className="text-sm font-medium">Variant</Label>
                    <Select 
                      value={discount.variant_id || 'all_variants'}
                      onValueChange={(value) => handleVariantSelect(index, value)}
                      disabled={!discount.product_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All variants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_variants">All Variants</SelectItem>
                        {getSelectedProduct(discount.product_id)?.variants?.map((variant) => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name} - ₹{variant.selling_price}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Discount Type</Label>
                    <Select 
                      value={discount.discount_type}
                      onValueChange={(value: 'percentage' | 'amount') => updateProductDiscount(index, 'discount_type', value)}
                    >
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
                    <Label className="text-sm font-medium">Discount Value *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount.discount_value || ''}
                      onChange={(e) => updateProductDiscount(index, 'discount_value', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => removeProductDiscount(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="is_active">Scheme Status</Label>
            <Select name="is_active" defaultValue={selectedScheme?.is_active?.toString() || 'true'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
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
