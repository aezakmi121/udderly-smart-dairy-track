
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { SchemeProductDiscounts } from './SchemeProductDiscounts';
import { SchemeHeader } from './scheme/SchemeHeader';
import { SchemeForm } from './scheme/SchemeForm';
import { SchemeTable } from './scheme/SchemeTable';

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

export const MilkSchemeSettings = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<MilkScheme | null>(null);
  const [showDiscounts, setShowDiscounts] = useState<string | null>(null);
  const { schemes, isLoading, schemeMutation, deleteScheme } = useMilkSchemes();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const schemeData = {
      scheme_name: formData.get('scheme_name') as string,
      cow_milk_rate: parseFloat(formData.get('cow_milk_rate') as string),
      buffalo_milk_rate: parseFloat(formData.get('buffalo_milk_rate') as string),
      discount_type: formData.get('discount_type') as 'amount' | 'percentage',
      discount_value: parseFloat(formData.get('discount_value') as string) || 0,
      is_active: formData.get('is_active') === 'true'
    };

    try {
      await schemeMutation.mutateAsync({
        schemeData,
        isUpdate: !!selectedScheme,
        id: selectedScheme?.id
      });
      
      setIsDialogOpen(false);
      setSelectedScheme(null);
    } catch (error) {
      console.error('Error saving scheme:', error);
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
    <div className="space-y-6">
      <SchemeHeader onAddScheme={() => openDialog()} />

      <Card>
        <CardHeader>
          <CardTitle>Active Schemes</CardTitle>
        </CardHeader>
        <CardContent>
          <SchemeTable
            schemes={schemes}
            isLoading={isLoading}
            onEdit={openDialog}
            onDelete={handleDelete}
            onConfigureDiscounts={handleConfigureDiscounts}
          />
        </CardContent>
      </Card>

      <SchemeForm
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        selectedScheme={selectedScheme}
        onSubmit={handleSubmit}
        isLoading={schemeMutation.isPending}
      />
    </div>
  );
};
