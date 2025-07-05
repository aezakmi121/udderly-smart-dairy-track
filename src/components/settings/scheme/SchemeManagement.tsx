
import React, { useState } from 'react';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { useSchemeDiscounts } from '@/hooks/useSchemeDiscounts';
import { SchemeProductDiscounts } from '../SchemeProductDiscounts';
import { SchemeHeader } from './SchemeHeader';
import { SchemeForm } from './SchemeForm';
import { SchemeTable } from './SchemeTable';

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

export const SchemeManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<MilkScheme | null>(null);
  const [showDiscounts, setShowDiscounts] = useState<string | null>(null);
  const { schemes, isLoading, schemeMutation, deleteScheme } = useMilkSchemes();
  const { discountMutation } = useSchemeDiscounts();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, productDiscounts: ProductDiscount[]) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const schemeData = {
      scheme_name: formData.get('scheme_name') as string,
      cow_milk_rate: 60,
      buffalo_milk_rate: 75,
      discount_type: formData.get('discount_type') as 'amount' | 'percentage',
      discount_value: parseFloat(formData.get('discount_value') as string) || 0,
      is_active: false // Set schemes as inactive by default
    };

    try {
      const result = await schemeMutation.mutateAsync({
        schemeData,
        isUpdate: !!selectedScheme,
        id: selectedScheme?.id
      });

      // Save product discounts if any
      if (productDiscounts.length > 0) {
        const schemeId = selectedScheme?.id || result.id;
        
        for (const discount of productDiscounts) {
          if (discount.product_id && discount.discount_value > 0) {
            await discountMutation.mutateAsync({
              discountData: {
                scheme_id: schemeId,
                product_id: discount.product_id,
                variant_id: discount.variant_id || null,
                discount_type: discount.discount_type,
                discount_value: discount.discount_value,
                is_active: true
              },
              isUpdate: false
            });
          }
        }
      }
      
      setIsDialogOpen(false);
      setSelectedScheme(null);
    } catch (error) {
      console.error('Error saving scheme:', error);
    }
  };

  const handleToggleActive = async (scheme: MilkScheme) => {
    try {
      await schemeMutation.mutateAsync({
        schemeData: {
          is_active: !scheme.is_active
        },
        isUpdate: true,
        id: scheme.id
      });
    } catch (error) {
      console.error('Error toggling scheme status:', error);
    }
  };

  const openDialog = (scheme?: MilkScheme) => {
    setSelectedScheme(scheme || null);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteScheme.mutate(id);
  };

  const handleConfigureDiscounts = (schemeId: string) => {
    setShowDiscounts(schemeId);
  };

  if (showDiscounts) {
    const scheme = schemes?.find(s => s.id === showDiscounts);
    if (scheme) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button 
              className="text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => setShowDiscounts(null)}
            >
              ← Back to Schemes
            </button>
            <h3 className="text-lg font-medium">Configure Product Discounts - {scheme.scheme_name}</h3>
          </div>
          <SchemeProductDiscounts 
            schemeId={scheme.id} 
            schemeName={scheme.scheme_name} 
          />
        </div>
      );
    }
  }

  return (
    <>
      <SchemeHeader onAddScheme={() => openDialog()} />
      
      <SchemeTable
        schemes={schemes}
        isLoading={isLoading}
        onEdit={openDialog}
        onDelete={handleDelete}
        onConfigureDiscounts={handleConfigureDiscounts}
        onToggleActive={handleToggleActive}
      />

      <SchemeForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedScheme={selectedScheme}
        onSubmit={handleSubmit}
        isLoading={schemeMutation.isPending}
      />
    </>
  );
};
