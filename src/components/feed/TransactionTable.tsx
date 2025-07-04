
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface TransactionTableProps {
  transactions: any[];
  isLoading: boolean;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-4">Loading transactions...</div>;
  }

  if (!transactions || transactions.length === 0) {
    return <div className="text-center py-4">No transactions found.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Feed Item</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Unit Cost</TableHead>
          <TableHead>Total Cost</TableHead>
          <TableHead>Supplier</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</TableCell>
            <TableCell>{transaction.feed_items?.name || 'N/A'}</TableCell>
            <TableCell>
              <Badge variant={transaction.transaction_type === 'incoming' ? "default" : "secondary"}>
                {transaction.transaction_type === 'incoming' ? 'Purchase' : 'Usage'}
              </Badge>
            </TableCell>
            <TableCell>
              {transaction.quantity} {transaction.feed_items?.unit || ''}
            </TableCell>
            <TableCell>
              {transaction.unit_cost ? `₹${transaction.unit_cost}` : '-'}
            </TableCell>
            <TableCell className="font-semibold">
              {transaction.total_cost ? `₹${transaction.total_cost}` : '-'}
            </TableCell>
            <TableCell>{transaction.supplier_name || '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
