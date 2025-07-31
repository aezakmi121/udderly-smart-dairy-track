
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface CategoryTableProps {
  categories: any[];
  isLoading: boolean;
  onEdit?: (category: any) => void;
  onDelete?: (id: string) => void;
}

export const CategoryTable: React.FC<CategoryTableProps> = ({ 
  categories, 
  isLoading, 
  onEdit, 
  onDelete 
}) => {
  const { canEdit } = useUserPermissions();

  if (isLoading) {
    return <div className="text-center py-4">Loading categories...</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="text-center py-4">No categories found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created</TableHead>
          {canEdit.feedManagement && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <TableRow key={category.id}>
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell>{category.description || '-'}</TableCell>
            <TableCell>
              {new Date(category.created_at).toLocaleDateString()}
            </TableCell>
            {canEdit.feedManagement && (
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete?.(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
