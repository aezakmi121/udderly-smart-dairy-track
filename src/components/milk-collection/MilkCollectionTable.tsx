
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface MilkCollectionTableProps {
  collections: any[];
  isLoading: boolean;
}

export const MilkCollectionTable: React.FC<MilkCollectionTableProps> = ({ collections, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading milk collections...</div>;
  }

  if (!collections || collections.length === 0) {
    return <div className="text-center py-4">No milk collections found.</div>;
  }

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
            <TableCell className="capitalize">{collection.session}</TableCell>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
