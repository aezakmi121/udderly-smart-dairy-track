
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

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

interface VariantsListProps {
  variants: ProductVariant[];
  unitType: 'weight' | 'volume' | 'piece';
  fractionalAllowed?: boolean;
  onAddVariant: () => void;
  onUpdateVariant: (id: string, field: keyof ProductVariant, value: string | number) => void;
  onRemoveVariant: (id: string) => void;
}

const UNIT_OPTIONS = {
  weight: ['kg', 'g', 'mg', 'lb', 'oz'],
  volume: ['L', 'ml', 'gal', 'fl oz', 'cup'],
  piece: ['pcs', 'pack', 'box', 'dozen', 'set']
};

export const VariantsList: React.FC<VariantsListProps> = ({
  variants,
  unitType,
  fractionalAllowed = false,
  onAddVariant,
  onUpdateVariant,
  onRemoveVariant
}) => {
  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-medium">
            {fractionalAllowed ? 'Bulk Stock Configuration' : 'Product Variants'}
          </h3>
          {fractionalAllowed && (
            <p className="text-sm text-muted-foreground">
              Configure the bulk stock from which fractional quantities will be sold
            </p>
          )}
        </div>
        {!fractionalAllowed && (
          <Button type="button" onClick={onAddVariant} variant="outline" size="sm">
            <Plus className="h-3 w-3 mr-1" />
            Add Variant
          </Button>
        )}
      </div>
      
      {variants.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-8 gap-2 text-sm font-medium">
            <div>{fractionalAllowed ? 'Stock Name *' : 'Name *'}</div>
            <div>{fractionalAllowed ? 'Unit Size *' : 'Size *'}</div>
            <div>Unit *</div>
            <div>Cost Price</div>
            <div>Price per {unitType === 'weight' ? 'kg' : unitType === 'volume' ? 'L' : 'unit'} *</div>
            <div>Total Stock *</div>
            <div>Low Stock Alert</div>
            <div>Action</div>
          </div>
          {variants.map((variant) => (
            <div key={variant.id} className="grid grid-cols-8 gap-2">
              <Input 
                placeholder={fractionalAllowed ? "Bulk Curd" : "1L Pouch"} 
                value={variant.name}
                onChange={(e) => onUpdateVariant(variant.id, 'name', e.target.value)}
                disabled={fractionalAllowed}
              />
              <Input 
                placeholder="1" 
                type="number"
                step="0.01"
                value={variant.size || ''}
                onChange={(e) => onUpdateVariant(variant.id, 'size', parseFloat(e.target.value) || 0)}
                disabled={fractionalAllowed}
              />
              <Select 
                value={variant.unit} 
                onValueChange={(value) => onUpdateVariant(variant.id, 'unit', value)}
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
                placeholder="45 (optional)" 
                type="number"
                step="0.01"
                value={variant.cost_price || ''}
                onChange={(e) => onUpdateVariant(variant.id, 'cost_price', parseFloat(e.target.value) || 0)}
              />
              <Input 
                placeholder={fractionalAllowed ? "55 per kg" : "55"} 
                type="number"
                step="0.01"
                value={variant.selling_price || ''}
                onChange={(e) => onUpdateVariant(variant.id, 'selling_price', parseFloat(e.target.value) || 0)}
              />
              <Input 
                placeholder={fractionalAllowed ? "50 kg total" : "50"} 
                type="number"
                value={variant.stock_quantity || ''}
                onChange={(e) => onUpdateVariant(variant.id, 'stock_quantity', parseFloat(e.target.value) || 0)}
              />
              <Input 
                placeholder="10" 
                type="number"
                value={variant.low_stock_alert || ''}
                onChange={(e) => onUpdateVariant(variant.id, 'low_stock_alert', parseFloat(e.target.value) || 0)}
              />
              <Button 
                type="button"
                onClick={() => onRemoveVariant(variant.id)} 
                variant="destructive" 
                size="sm"
                disabled={fractionalAllowed && variants.length === 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {fractionalAllowed && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> For fractional products like curd, you maintain one bulk stock. 
            When customers buy (e.g., 0.5 kg), that amount is deducted from your total stock.
          </p>
        </div>
      )}
    </div>
  );
};
