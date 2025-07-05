
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

interface SchemeFormProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScheme: MilkScheme | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export const SchemeForm: React.FC<SchemeFormProps> = ({
  isOpen,
  onClose,
  selectedScheme,
  onSubmit,
  isLoading
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedScheme ? 'Edit Scheme' : 'Add New Scheme'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="scheme_name">Scheme Name *</Label>
            <Input
              id="scheme_name"
              name="scheme_name"
              defaultValue={selectedScheme?.scheme_name || ''}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cow_milk_rate">Cow Milk Rate (₹/L) *</Label>
              <Input
                id="cow_milk_rate"
                name="cow_milk_rate"
                type="number"
                step="0.01"
                defaultValue={selectedScheme?.cow_milk_rate || 60}
                required
              />
            </div>
            <div>
              <Label htmlFor="buffalo_milk_rate">Buffalo Milk Rate (₹/L) *</Label>
              <Input
                id="buffalo_milk_rate"
                name="buffalo_milk_rate"
                type="number"
                step="0.01"
                defaultValue={selectedScheme?.buffalo_milk_rate || 75}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select name="discount_type" defaultValue={selectedScheme?.discount_type || 'amount'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discount_value">Discount Value</Label>
              <Input
                id="discount_value"
                name="discount_value"
                type="number"
                step="0.01"
                defaultValue={selectedScheme?.discount_value || 0}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="is_active">Status</Label>
            <Select name="is_active" defaultValue={selectedScheme?.is_active?.toString() || 'true'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (selectedScheme ? 'Update' : 'Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
