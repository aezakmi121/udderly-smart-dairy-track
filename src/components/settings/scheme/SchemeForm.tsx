
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
  const { products, productsLoading } = usePOSData();

  useEffect(() => {
    if (!isOpen) {
      setProductDiscounts([]);
    }
  }, [isOpen]);

  const addProductDiscount = () => {
    setProductDiscounts([...productDiscounts, {
      product_id: '',
      variant_id: '',
      discount_type: 'amount',
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

  const getProductName = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    return product?.name || 'Select Product';
  };

  const getVariantName = (productId: string, variantId: string) => {
    const product = products?.find(p => p.id === productId);
    const variant = product?.variants?.find(v => v.id === variantId);
    return variant ? `${variant.name} - ₹${variant.selling_price}` : 'All Variants';
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(e, productDiscounts);
  };

  if (productsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-4">Loading products...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedScheme ? 'Edit Scheme' : 'Create New Scheme'}
          </DialogTitle>
          <DialogDescription>
            Create a discount scheme by selecting products and setting discount amounts.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div>
            <Label htmlFor="scheme_name">Scheme Name *</Label>
            <Input
              id="scheme_name"
              name="scheme_name"
              placeholder="e.g., Advance Payment Scheme"
              defaultValue={selectedScheme?.scheme_name || ''}
              required
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Discounts</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add products and set discount amounts for this scheme
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProductDiscount}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {productDiscounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No products added yet.</p>
                  <p className="text-sm">Click "Add Product" to start adding discounts.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {productDiscounts.map((discount, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <Label>Product *</Label>
                          <Select 
                            value={discount.product_id} 
                            onValueChange={(value) => {
                              updateProductDiscount(index, 'product_id', value);
                              updateProductDiscount(index, 'variant_id', ''); // Reset variant when product changes
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
                            value={discount.variant_id || 'all'} 
                            onValueChange={(value) => updateProductDiscount(index, 'variant_id', value === 'all' ? undefined : value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select variant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Variants</SelectItem>
                              {getProductVariants(discount.product_id).map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.name} - ₹{variant.selling_price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Discount</Label>
                          <div className="flex space-x-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Amount"
                              value={discount.discount_value}
                              onChange={(e) => updateProductDiscount(index, 'discount_value', parseFloat(e.target.value) || 0)}
                              className="flex-grow"
                            />
                            <Select 
                              value={discount.discount_type} 
                              onValueChange={(value) => updateProductDiscount(index, 'discount_type', value)}
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="amount">₹</SelectItem>
                                <SelectItem value="percentage">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
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
                      
                      {discount.product_id && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>{getProductName(discount.product_id)}</strong>
                          {discount.variant_id ? ` - ${getVariantName(discount.product_id, discount.variant_id)}` : ' - All Variants'}
                          <span className="ml-2">
                            → Discount: {discount.discount_value}{discount.discount_type === 'percentage' ? '%' : '₹'}
                          </span>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || productDiscounts.length === 0}
            >
              {isLoading ? 'Saving...' : (selectedScheme ? 'Update Scheme' : 'Create Scheme')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
