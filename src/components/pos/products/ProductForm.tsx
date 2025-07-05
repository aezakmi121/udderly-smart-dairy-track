
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ProductBasicInfo } from './ProductBasicInfo';
import { VariantsList } from './VariantsList';

interface ProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  cost_price?: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  unit_type: 'weight' | 'volume' | 'piece';
  fractional_allowed: boolean;
  created_at: string;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSave: (productData: any) => void;
  isLoading?: boolean;
}

const UNIT_OPTIONS = {
  weight: ['kg', 'g', 'mg', 'lb', 'oz'],
  volume: ['L', 'ml', 'gal', 'fl oz', 'cup'],
  piece: ['pcs', 'pack', 'box', 'dozen', 'set']
};

export const ProductForm: React.FC<ProductFormProps> = ({
  open,
  onOpenChange,
  product,
  onSave,
  isLoading = false
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [unitType, setUnitType] = useState<'weight' | 'volume' | 'piece'>('piece');
  const [fractionalAllowed, setFractionalAllowed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (product) {
      setProductName(product.name);
      setCategory(product.category);
      setUnitType(product.unit_type);
      setFractionalAllowed(product.fractional_allowed);
      setVariants(product.variants);
    } else {
      // Reset form
      setProductName('');
      setCategory('');
      setUnitType('piece');
      setFractionalAllowed(false);
      setVariants([]);
    }
  }, [product, open]);

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: Date.now().toString(),
      name: '',
      size: 0,
      unit: UNIT_OPTIONS[unitType][0],
      selling_price: 0,
      stock_quantity: 0,
      low_stock_alert: 0,
    };
    setVariants([...variants, newVariant]);
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    setVariants(variants.map(variant => 
      variant.id === id ? { ...variant, [field]: value } : variant
    ));
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter(variant => variant.id !== id));
  };

  const handleUnitTypeChange = (value: 'weight' | 'volume' | 'piece') => {
    setUnitType(value);
    // Update existing variants to use appropriate units
    setVariants(variants.map(variant => ({
      ...variant,
      unit: UNIT_OPTIONS[value][0]
    })));
  };

  const handleSave = () => {
    if (!productName || !category || variants.length === 0) {
      toast({ title: "Please fill all required fields and add at least one variant", variant: "destructive" });
      return;
    }

    const validVariants = variants.filter(v => v.name && v.size > 0 && v.selling_price > 0);
    if (validVariants.length === 0) {
      toast({ title: "Please add at least one valid variant with name, size, and selling price", variant: "destructive" });
      return;
    }

    const productData = {
      name: productName,
      category,
      unit_type: unitType,
      fractional_allowed: fractionalAllowed,
      variants: validVariants
    };

    onSave(productData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <ProductBasicInfo
            productName={productName}
            category={category}
            unitType={unitType}
            fractionalAllowed={fractionalAllowed}
            onProductNameChange={setProductName}
            onCategoryChange={setCategory}
            onUnitTypeChange={handleUnitTypeChange}
            onFractionalAllowedChange={setFractionalAllowed}
          />
          
          <VariantsList
            variants={variants}
            unitType={unitType}
            onAddVariant={addVariant}
            onUpdateVariant={updateVariant}
            onRemoveVariant={removeVariant}
          />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
