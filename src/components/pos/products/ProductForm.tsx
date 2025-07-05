
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductVariant {
  id: string;
  name: string;
  size: number;
  unit: string;
  cost_price: number;
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
      cost_price: 0,
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

  const handleSave = () => {
    if (!productName || !category || variants.length === 0) {
      toast({ title: "Please fill all required fields and add at least one variant", variant: "destructive" });
      return;
    }

    const validVariants = variants.filter(v => v.name && v.size > 0);
    if (validVariants.length === 0) {
      toast({ title: "Please add at least one valid variant", variant: "destructive" });
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name" 
                required 
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dairy">Dairy</SelectItem>
                  <SelectItem value="snacks">Snacks</SelectItem>
                  <SelectItem value="beverages">Beverages</SelectItem>
                  <SelectItem value="grains">Grains</SelectItem>
                  <SelectItem value="vegetables">Vegetables</SelectItem>
                  <SelectItem value="fruits">Fruits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Type *</Label>
              <Select value={unitType} onValueChange={(value: 'weight' | 'volume' | 'piece') => {
                setUnitType(value);
                // Update existing variants to use appropriate units
                setVariants(variants.map(variant => ({
                  ...variant,
                  unit: UNIT_OPTIONS[value][0]
                })));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight (kg, g, etc.)</SelectItem>
                  <SelectItem value="volume">Volume (L, ml, etc.)</SelectItem>
                  <SelectItem value="piece">Piece (pcs, pack, etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="fractional" 
                checked={fractionalAllowed}
                onChange={(e) => setFractionalAllowed(e.target.checked)}
              />
              <Label htmlFor="fractional">Allow Fractional Quantities</Label>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Product Variants</h3>
              <Button type="button" onClick={addVariant} variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Add Variant
              </Button>
            </div>
            
            {variants.length > 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-8 gap-2 text-sm font-medium">
                  <div>Name *</div>
                  <div>Size *</div>
                  <div>Unit *</div>
                  <div>Cost Price *</div>
                  <div>Selling Price *</div>
                  <div>Stock *</div>
                  <div>Low Stock Alert</div>
                  <div>Action</div>
                </div>
                {variants.map((variant) => (
                  <div key={variant.id} className="grid grid-cols-8 gap-2">
                    <Input 
                      placeholder="1L Pouch" 
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                    />
                    <Input 
                      placeholder="1" 
                      type="number"
                      step="0.01"
                      value={variant.size || ''}
                      onChange={(e) => updateVariant(variant.id, 'size', parseFloat(e.target.value) || 0)}
                    />
                    <Select 
                      value={variant.unit} 
                      onValueChange={(value) => updateVariant(variant.id, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS[unitType].map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="45" 
                      type="number"
                      step="0.01"
                      value={variant.cost_price || ''}
                      onChange={(e) => updateVariant(variant.id, 'cost_price', parseFloat(e.target.value) || 0)}
                    />
                    <Input 
                      placeholder="55" 
                      type="number"
                      step="0.01"
                      value={variant.selling_price || ''}
                      onChange={(e) => updateVariant(variant.id, 'selling_price', parseFloat(e.target.value) || 0)}
                    />
                    <Input 
                      placeholder="50" 
                      type="number"
                      value={variant.stock_quantity || ''}
                      onChange={(e) => updateVariant(variant.id, 'stock_quantity', parseFloat(e.target.value) || 0)}
                    />
                    <Input 
                      placeholder="10" 
                      type="number"
                      value={variant.low_stock_alert || ''}
                      onChange={(e) => updateVariant(variant.id, 'low_stock_alert', parseFloat(e.target.value) || 0)}
                    />
                    <Button 
                      type="button"
                      onClick={() => removeVariant(variant.id)} 
                      variant="destructive" 
                      size="sm"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
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
