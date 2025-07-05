
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface MilkCollectionTableProps {
  collections: any[];
  isLoading: boolean;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

export const MilkCollectionTable: React.FC<MilkCollectionTableProps> = ({ 
  collections, 
  isLoading, 
  canDelete = false,
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
          {canDelete && <TableHead>Actions</TableHead>}
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
            <TableCell>{format(new Date(collection.collection_date), 'MMM dd, yyyy')}</TableCell>
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
            {canDelete && (
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(collection.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
