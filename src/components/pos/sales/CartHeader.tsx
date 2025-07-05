
import React from 'react';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Trash2 } from 'lucide-react';

interface CartHeaderProps {
  itemCount: number;
  onClearAll: () => void;
}

export const CartHeader: React.FC<CartHeaderProps> = ({
  itemCount,
  onClearAll
}) => {
  return (
    <CardTitle className="flex items-center gap-2">
      <ShoppingCart className="h-5 w-5" />
      Cart ({itemCount} items)
      {itemCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="ml-auto text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </CardTitle>
  );
};
