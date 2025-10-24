import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CollectionCenterSalesTableProps {
  sales: any[];
  isLoading: boolean;
  onEdit: (sale: any) => void;
  onDelete: (id: string) => void;
}

export const CollectionCenterSalesTable = ({ sales, isLoading, onEdit, onDelete }: CollectionCenterSalesTableProps) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sales recorded yet. Add your first sale to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Quantity (L)</TableHead>
            <TableHead>Rate (₹/L)</TableHead>
            <TableHead>Amount (₹)</TableHead>
            <TableHead>Payment Status</TableHead>
            <TableHead>Payment Month</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell>{format(new Date(sale.sale_date), 'dd MMM yyyy')}</TableCell>
              <TableCell className="font-medium">{sale.customer_name}</TableCell>
              <TableCell>{Number(sale.quantity).toFixed(1)}</TableCell>
              <TableCell>₹{Number(sale.rate_per_liter).toFixed(2)}</TableCell>
              <TableCell>₹{Number(sale.total_amount).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {sale.payment_status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(sale.payment_month), 'MMM yyyy')}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(sale)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(sale.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
