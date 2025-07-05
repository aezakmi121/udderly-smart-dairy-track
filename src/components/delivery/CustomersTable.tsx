
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit2, Eye, Trash2, CreditCard } from 'lucide-react';
import { useMilkSchemes } from '@/hooks/useMilkSchemes';
import { CustomerCreditManager } from './CustomerCreditManager';

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
  scheme_id: string | null;
  milk_type: string;
  created_at: string;
  updated_at: string;
  current_credit: number;
  last_payment_date: string | null;
}

interface CustomersTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onBulkDelete: (customerIds: string[]) => void;
  canEdit: boolean;
}

export const CustomersTable: React.FC<CustomersTableProps> = ({
  customers,
  onEdit,
  onBulkDelete,
  canEdit
}) => {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<Customer | null>(null);
  const { schemes } = useMilkSchemes();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomers(customers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    if (checked) {
      setSelectedCustomers(prev => [...prev, customerId]);
    } else {
      setSelectedCustomers(prev => prev.filter(id => id !== customerId));
    }
  };

  const handleBulkDelete = () => {
    if (selectedCustomers.length > 0 && canEdit) {
      if (confirm(`Are you sure you want to delete ${selectedCustomers.length} customer(s)?`)) {
        onBulkDelete(selectedCustomers);
        setSelectedCustomers([]);
      }
    }
  };

  const getSchemeName = (schemeId: string | null) => {
    if (!schemeId) return 'Regular';
    const scheme = schemes?.find(s => s.id === schemeId);
    return scheme?.scheme_name || 'Unknown';
  };

  return (
    <div className="space-y-4">
      {canEdit && selectedCustomers.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg">
          <span className="text-sm font-medium">
            {selectedCustomers.length} customer(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {canEdit && (
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Milk Type</TableHead>
            <TableHead>Daily Qty</TableHead>
            <TableHead>Scheme</TableHead>
            <TableHead>Rate/L</TableHead>
            <TableHead>Credit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((customer) => (
            <TableRow key={customer.id}>
              {canEdit && (
                <TableCell>
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked as boolean)}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{customer.customer_code}</TableCell>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.phone_number}</TableCell>
              <TableCell>{customer.area || 'Not specified'}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {customer.milk_type === 'cow' ? 'Cow' : 'Buffalo'}
                </Badge>
              </TableCell>
              <TableCell>{customer.daily_quantity}L</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {getSchemeName(customer.scheme_id)}
                </Badge>
              </TableCell>
              <TableCell>₹{customer.rate_per_liter}</TableCell>
              <TableCell>
                {customer.current_credit > 0 ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setSelectedCreditCustomer(customer)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        ₹{customer.current_credit}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Credit Management - {customer.name}</DialogTitle>
                      </DialogHeader>
                      {selectedCreditCustomer && (
                        <CustomerCreditManager customer={selectedCreditCustomer} />
                      )}
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Badge variant="outline" className="text-green-600">
                    Clear
                  </Badge>
                )}
              </TableCell>
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
    </div>
  );
};
