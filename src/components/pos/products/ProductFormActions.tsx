
import React from 'react';
import { Button } from '@/components/ui/button';

interface ProductFormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isLoading: boolean;
}

export const ProductFormActions: React.FC<ProductFormActionsProps> = ({
  onCancel,
  onSave,
  isLoading
}) => {
  return (
    <div className="flex justify-end space-x-2 pt-4">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Product'}
      </Button>
    </div>
  );
};
