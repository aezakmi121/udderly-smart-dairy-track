
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface TransactionTableProps {
  transactions: any[];
  isLoading: boolean;
  onEdit?: (transaction: any) => void;
  onDelete?: (id: string) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  isLoading, 
  onEdit, 
  onDelete 
}) => {
  const { canEdit } = useUserPermissions();

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
          {canEdit.feedManagement && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
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
            {canEdit.feedManagement && (
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(transaction)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete?.(transaction.id)}
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
