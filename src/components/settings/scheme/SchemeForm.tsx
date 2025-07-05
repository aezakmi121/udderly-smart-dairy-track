
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { usePOSProducts } from '@/hooks/pos/usePOSProducts';

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
  const { products, productsLoading } = usePOSProducts();
  const [productDiscounts, setProductDiscounts] = useState<ProductDiscount[]>([]);

  useEffect(() => {
    console.log('POS Products loaded in SchemeForm:', products);
    console.log('Products loading state:', productsLoading);
  }, [products, productsLoading]);

  const addProductDiscount = () => {
    setProductDiscounts([...productDiscounts, {
      product_id: '',
      variant_id: undefined,
      discount_type: 'percentage',
      discount_value: 0
    }]);
  };

  const removeProductDiscount = (index: number) => {
    setProductDiscounts(productDiscounts.filter((_, i) => i !== index));
  };

  const updateProductDiscount = (index: number, field: string, value: any) => {
    const updated = [...productDiscounts];
    updated[index] = { ...updated[index], [field]: value };
    setProductDiscounts(updated);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    onSubmit(e, productDiscounts);
    setProductDiscounts([]);
  };

  const getSelectedProduct = (productId: string) => {
    return products?.find(p => p.id === productId);
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
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Default Discount Type</Label>
              <Select name="discount_type" defaultValue={selectedScheme?.discount_type || 'amount'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discount_value">Default Discount Value</Label>
              <Input
                id="discount_value"
                name="discount_value"
                type="number"
                step="0.01"
                defaultValue={selectedScheme?.discount_value || 0}
              />
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Product Discounts</CardTitle>
              <Button type="button" onClick={addProductDiscount} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Product Discount
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {productsLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Loading products...
                </p>
              )}
              
              {!productsLoading && (!products || products.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No products available. Please add products in the POS Products section first.
                </p>
              )}

              {productDiscounts.map((discount, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-end p-3 border rounded">
                  <div>
                    <Label>Product</Label>
                    <Select 
                      value={discount.product_id}
                      onValueChange={(value) => {
                        updateProductDiscount(index, 'product_id', value);
                        updateProductDiscount(index, 'variant_id', undefined);
                      }}
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
                    <Label>Variant</Label>
                    <Select 
                      value={discount.variant_id || 'all_variants'}
                      onValueChange={(value) => updateProductDiscount(index, 'variant_id', value === 'all_variants' ? undefined : value)}
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
                    <Label>Type</Label>
                    <Select 
                      value={discount.discount_type}
                      onValueChange={(value) => updateProductDiscount(index, 'discount_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discount.discount_value}
                      onChange={(e) => updateProductDiscount(index, 'discount_value', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeProductDiscount(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {productDiscounts.length === 0 && !productsLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No product discounts added. Click "Add Product Discount" to configure specific product discounts.
                </p>
              )}
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="is_active">Status</Label>
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

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedScheme ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
