
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Eye } from 'lucide-react';

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone_number: string;
  address: string;
  area: string | null;
  daily_quantity: number;
  delivery_time: string;
  subscription_type: string;
  rate_per_liter: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomersTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  canEdit: boolean;
}

export const CustomersTable: React.FC<CustomersTableProps> = ({
  customers,
  onEdit,
  canEdit
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Daily Qty</TableHead>
          <TableHead>Rate/L</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers?.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">{customer.customer_code}</TableCell>
            <TableCell>{customer.name}</TableCell>
            <TableCell>{customer.phone_number}</TableCell>
            <TableCell>{customer.area || 'Not specified'}</TableCell>
            <TableCell>{customer.daily_quantity}L</TableCell>
            <TableCell>₹{customer.rate_per_liter}</TableCell>
            <TableCell>
              <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                {customer.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(customer)}
                  disabled={!canEdit}
                >
                  {canEdit ? <Edit2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
