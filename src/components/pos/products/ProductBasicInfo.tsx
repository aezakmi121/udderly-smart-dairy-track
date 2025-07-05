
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Category {
  id: string;
  name: string;
  description: string;
  product_count: number;
  created_at: string;
}

interface ProductBasicInfoProps {
  productName: string;
  category: string;
  unitType: 'weight' | 'volume' | 'piece';
  fractionalAllowed: boolean;
  categories?: Category[];
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
  categories,
  onProductNameChange,
  onCategoryChange,
  onUnitTypeChange,
  onFractionalAllowedChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="productName">Product Name *</Label>
        <Input
          id="productName"
          value={productName}
          onChange={(e) => onProductNameChange(e.target.value)}
          placeholder="Enter product name"
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={onCategoryChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(!categories || categories.length === 0) && (
          <p className="text-xs text-muted-foreground mt-1">
            No categories available. Please add categories first.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="unitType">Unit Type</Label>
        <Select value={unitType} onValueChange={onUnitTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weight">Weight (kg, g, etc.)</SelectItem>
            <SelectItem value="volume">Volume (L, ml, etc.)</SelectItem>
            <SelectItem value="piece">Piece (pcs, pack, etc.)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="fractionalAllowed"
          checked={fractionalAllowed}
          onCheckedChange={onFractionalAllowedChange}
        />
        <Label htmlFor="fractionalAllowed">Allow Fractional Quantities</Label>
      </div>
    </div>
  );
};
