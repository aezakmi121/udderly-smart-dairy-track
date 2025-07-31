
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface FeedItemTableProps {
  feedItems: any[];
  isLoading: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
}

export const FeedItemTable: React.FC<FeedItemTableProps> = ({ 
  feedItems, 
  isLoading, 
  onEdit, 
  onDelete 
}) => {
  const { canEdit } = useUserPermissions();

  if (isLoading) {
    return <div className="text-center py-4">Loading feed items...</div>;
  }

  if (!feedItems || feedItems.length === 0) {
    return <div className="text-center py-4">No feed items found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Unit</TableHead>
          <TableHead>Current Stock</TableHead>
          <TableHead>Min Level</TableHead>
          <TableHead>Cost per Unit</TableHead>
          <TableHead>Status</TableHead>
          {canEdit.feedManagement && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {feedItems.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{item.feed_categories?.name || 'N/A'}</TableCell>
            <TableCell>{item.unit}</TableCell>
            <TableCell>{item.current_stock}</TableCell>
            <TableCell>{item.minimum_stock_level}</TableCell>
            <TableCell>
              {item.cost_per_unit ? `₹${item.cost_per_unit}` : '-'}
            </TableCell>
            <TableCell>
              <Badge variant={item.current_stock > item.minimum_stock_level ? "default" : "destructive"}>
                {item.current_stock > item.minimum_stock_level ? "In Stock" : "Low Stock"}
              </Badge>
            </TableCell>
            {canEdit.feedManagement && (
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete?.(item.id)}
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
