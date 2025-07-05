
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Get variant_id and properly handle empty string and "all_variants"
    const variantIdValue = formData.get('variant_id') as string;
    let variantId = null;
    
    // Only set variantId if it's a real variant ID (not null, empty, or "all_variants")
    if (variantIdValue && variantIdValue.trim() !== '' && variantIdValue !== 'all_variants') {
      variantId = variantIdValue;
    }
    
    console.log('Form submission data:', {
      scheme_id: schemeId,
      product_id: formData.get('product_id') as string,
      variant_id: variantId,
      discount_type: formData.get('discount_type') as 'percentage' | 'amount',
      discount_value: parseFloat(formData.get('discount_value') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    });
    
    const discountData = {
      scheme_id: schemeId,
      product_id: formData.get('product_id') as string,
      variant_id: variantId,
      discount_type: formData.get('discount_type') as 'percentage' | 'amount',
      discount_value: parseFloat(formData.get('discount_value') as string) || 0,
      is_active: formData.get('is_active') === 'true'
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
