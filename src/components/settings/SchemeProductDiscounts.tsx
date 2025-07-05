
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useSchemeDiscounts } from '@/hooks/useSchemeDiscounts';
import { usePOSData } from '@/hooks/usePOSData';
import { DiscountForm } from './discount/DiscountForm';
import { DiscountTable } from './discount/DiscountTable';

interface SchemeProductDiscountsProps {
  schemeId: string;
  schemeName: string;
}

export const SchemeProductDiscounts: React.FC<SchemeProductDiscountsProps> = ({
  schemeId,
  schemeName
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const { discounts, isLoading, discountMutation, deleteDiscount } = useSchemeDiscounts();
  const { products } = usePOSData();

  const schemeDiscounts = discounts?.filter(d => d.scheme_id === schemeId) || [];

  const handleSubmit = async (formData: {
    product_id: string;
    variant_id: string | null;
    discount_type: 'percentage' | 'amount';
    discount_value: number;
    is_active: boolean;
  }) => {
    console.log('Form submission data:', {
      scheme_id: schemeId,
      ...formData
    });
    
    // Validate that we have a proper product_id
    if (!formData.product_id || formData.product_id.trim() === '') {
      console.error('Invalid product_id:', formData.product_id);
      return;
    }
    
    // Validate that if variant_id is provided, it's a proper UUID
    if (formData.variant_id && formData.variant_id.length < 10) {
      console.error('Invalid variant_id format:', formData.variant_id);
      return;
    }
    
    const discountData = {
      scheme_id: schemeId,
      product_id: formData.product_id,
      variant_id: formData.variant_id,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      is_active: formData.is_active
    };

    try {
      await discountMutation.mutateAsync({
        discountData,
        isUpdate: !!selectedDiscount,
        id: selectedDiscount?.id
      });
      
      setIsDialogOpen(false);
      setSelectedDiscount(null);
    } catch (error) {
      console.error('Error saving discount:', error);
    }
  };

  const openDialog = (discount?: any) => {
    setSelectedDiscount(discount || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteDiscount.mutate(id);
  };

  const getProductName = (productId: string, variantId?: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return 'Unknown Product';
    
    if (variantId) {
      const variant = product.variants?.find(v => v.id === variantId);
      return variant ? `${product.name} - ${variant.name}` : product.name;
    }
    
    return product.name;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Discounts - {schemeName}</CardTitle>
            <p className="text-sm text-muted-foreground">Configure discounts for specific products and variants</p>
          </div>
          
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product Discount
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DiscountTable
          discounts={schemeDiscounts}
          isLoading={isLoading}
          onEdit={openDialog}
          onDelete={handleDelete}
          getProductName={getProductName}
        />
      </CardContent>

      <DiscountForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedDiscount={selectedDiscount}
        products={products}
        onSubmit={handleSubmit}
        isLoading={discountMutation.isPending}
      />
    </Card>
  );
};
