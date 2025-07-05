
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductBasicInfoProps {
  productName: string;
  category: string;
  unitType: 'weight' | 'volume' | 'piece';
  fractionalAllowed: boolean;
  onProductNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onUnitTypeChange: (value: 'weight' | 'volume' | 'piece') => void;
  onFractionalAllowedChange: (value: boolean) => void;
}

export const ProductBasicInfo: React.FC<ProductBasicInfoProps> = ({
  productName,
  category,
  unitType,
  fractionalAllowed,
  onProductNameChange,
  onCategoryChange,
  onUnitTypeChange,
  onFractionalAllowedChange
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Product Name *</Label>
        <Input 
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          placeholder="Enter product name" 
          required 
        />
      </div>
      <div>
        <Label>Category *</Label>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dairy Products">Dairy Products</SelectItem>
            <SelectItem value="Snacks">Snacks</SelectItem>
            <SelectItem value="Beverages">Beverages</SelectItem>
            <SelectItem value="Grains">Grains</SelectItem>
            <SelectItem value="Vegetables">Vegetables</SelectItem>
            <SelectItem value="Fruits">Fruits</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Unit Type *</Label>
        <Select value={unitType} onValueChange={onUnitTypeChange}>
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
          onChange={(e) => onFractionalAllowedChange(e.target.checked)}
        />
        <Label htmlFor="fractional">Allow Fractional Quantities</Label>
      </div>
    </div>
  );
};
