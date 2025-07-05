
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Settings } from 'lucide-react';

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

interface SchemeTableProps {
  schemes: MilkScheme[] | undefined;
  isLoading: boolean;
  onEdit: (scheme: MilkScheme) => void;
  onDelete: (id: string) => void;
  onConfigureDiscounts: (schemeId: string) => void;
}

export const SchemeTable: React.FC<SchemeTableProps> = ({
  schemes,
  isLoading,
  onEdit,
  onDelete,
  onConfigureDiscounts
}) => {
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this scheme?')) {
      onDelete(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading schemes...</div>;
  }

  if (!schemes || schemes.length === 0) {
    return <div className="text-center py-4">No schemes found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Cow Rate</TableHead>
          <TableHead>Buffalo Rate</TableHead>
          <TableHead>Discount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schemes.map((scheme) => (
          <TableRow key={scheme.id}>
            <TableCell className="font-medium">{scheme.scheme_name}</TableCell>
            <TableCell>₹{scheme.cow_milk_rate}/L</TableCell>
            <TableCell>₹{scheme.buffalo_milk_rate}/L</TableCell>
            <TableCell>
              {scheme.discount_value > 0 
                ? `${scheme.discount_value}${scheme.discount_type === 'percentage' ? '%' : '₹'}`
                : 'No discount'
              }
            </TableCell>
            <TableCell>
              <Badge variant={scheme.is_active ? 'default' : 'secondary'}>
                {scheme.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigureDiscounts(scheme.id)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(scheme)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(scheme.id)}
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
