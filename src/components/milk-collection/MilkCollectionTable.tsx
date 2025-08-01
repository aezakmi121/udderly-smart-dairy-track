
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface MilkCollectionTableProps {
  collections: any[];
  isLoading: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (collection: any) => void;
  onDelete?: (id: string) => void;
}

export const MilkCollectionTable: React.FC<MilkCollectionTableProps> = ({ 
  collections, 
  isLoading, 
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete 
}) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading milk collections...</div>;
  }

  if (!collections || collections.length === 0) {
    return <div className="text-center py-4">No milk collections found.</div>;
  }

  const handleDelete = (id: string) => {
    if (onDelete && confirm('Are you sure you want to delete this collection record?')) {
      onDelete(id);
    }
  };

  const handleEdit = (collection: any) => {
    if (onEdit) {
      onEdit(collection);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Farmer</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Quantity (L)</TableHead>
          <TableHead>Fat %</TableHead>
          <TableHead>SNF %</TableHead>
          <TableHead>Rate</TableHead>
          <TableHead>Total Amount</TableHead>
          <TableHead>Status</TableHead>
          {(canEdit || canDelete) && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {collections.map((collection) => (
          <TableRow key={collection.id}>
            <TableCell>
              <div>
                <div className="font-medium">{collection.farmers?.name || 'N/A'}</div>
                <div className="text-sm text-muted-foreground">
                  {collection.farmers?.farmer_code || 'N/A'}
                </div>
              </div>
            </TableCell>
            <TableCell>{formatDate(collection.collection_date)}</TableCell>
            <TableCell className="capitalize">
              <Badge variant={collection.session === 'morning' ? 'default' : 'secondary'}>
                {collection.session}
              </Badge>
            </TableCell>
            <TableCell>{collection.quantity}</TableCell>
            <TableCell>{collection.fat_percentage}%</TableCell>
            <TableCell>{collection.snf_percentage}%</TableCell>
            <TableCell>₹{collection.rate_per_liter}</TableCell>
            <TableCell className="font-semibold">₹{collection.total_amount}</TableCell>
            <TableCell>
              <Badge variant={collection.is_accepted ? "default" : "destructive"}>
                {collection.is_accepted ? "Accepted" : "Rejected"}
              </Badge>
            </TableCell>
            {(canEdit || canDelete) && (
              <TableCell>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(collection)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(collection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
