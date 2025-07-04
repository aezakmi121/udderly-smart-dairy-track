
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface FeedItemTableProps {
  feedItems: any[];
  isLoading: boolean;
}

export const FeedItemTable: React.FC<FeedItemTableProps> = ({ feedItems, isLoading }) => {
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
