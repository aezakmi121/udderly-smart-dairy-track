
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface Discount {
  id: string;
  product_id: string;
  variant_id?: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
}

interface DiscountTableProps {
  discounts: Discount[];
  isLoading: boolean;
  onEdit: (discount: Discount) => void;
  onDelete: (id: string) => void;
  getProductName: (productId: string, variantId?: string) => string;
}

export const DiscountTable: React.FC<DiscountTableProps> = ({
  discounts,
  isLoading,
  onEdit,
  onDelete,
  getProductName
}) => {
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this discount?')) {
      onDelete(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading discounts...</div>;
  }

  if (discounts.length === 0) {
    return <div className="text-center py-4">No product discounts configured.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product/Variant</TableHead>
          <TableHead>Discount Type</TableHead>
          <TableHead>Discount Value</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {discounts.map((discount) => (
          <TableRow key={discount.id}>
            <TableCell className="font-medium">
              {getProductName(discount.product_id, discount.variant_id)}
              {!discount.variant_id && (
                <span className="text-xs text-muted-foreground block">All variants</span>
              )}
            </TableCell>
            <TableCell className="capitalize">{discount.discount_type}</TableCell>
            <TableCell>
              {discount.discount_value}{discount.discount_type === 'percentage' ? '%' : '₹'}
            </TableCell>
            <TableCell>
              <Badge variant={discount.is_active ? 'default' : 'secondary'}>
                {discount.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(discount)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(discount.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
