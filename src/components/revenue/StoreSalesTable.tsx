import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface StoreSalesTableProps {
  sales: any[];
  isLoading: boolean;
  onEdit: (sale: any) => void;
  onDelete: (id: string) => void;
}

export const StoreSalesTable = ({ sales, isLoading, onEdit, onDelete }: StoreSalesTableProps) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No store sales recorded yet. Add today's sale to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Cash (₹)</TableHead>
            <TableHead className="text-right">UPI (₹)</TableHead>
            <TableHead className="text-right">Credit (₹)</TableHead>
            <TableHead className="text-right">Total (₹)</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="font-medium">{format(new Date(sale.sale_date), 'dd MMM yyyy')}</TableCell>
              <TableCell className="text-right">₹{Number(sale.cash_amount).toLocaleString()}</TableCell>
              <TableCell className="text-right">₹{Number(sale.upi_amount).toLocaleString()}</TableCell>
              <TableCell className="text-right">₹{Number(sale.credit_amount).toLocaleString()}</TableCell>
              <TableCell className="text-right font-semibold">₹{Number(sale.total_amount).toLocaleString()}</TableCell>
              <TableCell className="max-w-xs truncate">{sale.notes || '-'}</TableCell>
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
