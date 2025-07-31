
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeedManagement } from '@/hooks/useFeedManagement';

interface TransactionFormProps {
  selectedTransaction?: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ selectedTransaction, onSubmit, isLoading }) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      feed_item_id: selectedTransaction?.feed_item_id || '',
      transaction_type: selectedTransaction?.transaction_type || 'incoming',
      quantity: selectedTransaction?.quantity || '',
      unit_cost: selectedTransaction?.unit_cost || '',
      total_cost: selectedTransaction?.total_cost || '',
      transaction_date: selectedTransaction?.transaction_date || new Date().toISOString().split('T')[0],
      supplier_name: selectedTransaction?.supplier_name || '',
      invoice_number: selectedTransaction?.invoice_number || '',
      notes: selectedTransaction?.notes || ''
    }
  });

  const { feedItems } = useFeedManagement();
  const quantity = watch('quantity');
  const unitCost = watch('unit_cost');

  const handleFormSubmit = (data: any) => {
    const totalCost = Number(data.quantity) * Number(data.unit_cost || 0);
    onSubmit({
      ...data,
      quantity: Number(data.quantity),
      unit_cost: data.unit_cost ? Number(data.unit_cost) : null,
      total_cost: totalCost || null
    });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{selectedTransaction ? 'Edit Transaction' : 'Record Transaction'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="feed_item_id">Feed Item</Label>
            <Select onValueChange={(value) => setValue('feed_item_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select feed item" />
              </SelectTrigger>
              <SelectContent>
                {feedItems?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select onValueChange={(value) => setValue('transaction_type', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incoming">Incoming (Purchase)</SelectItem>
                <SelectItem value="outgoing">Outgoing (Usage)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              type="number"
              step="0.1"
              {...register('quantity', { required: true })}
              placeholder="Quantity"
            />
          </div>

          <div>
            <Label htmlFor="unit_cost">Unit Cost (optional)</Label>
            <Input
              type="number"
              step="0.01"
              {...register('unit_cost')}
              placeholder="Cost per unit"
            />
          </div>

          <div>
            <Label htmlFor="supplier_name">Supplier Name</Label>
            <Input
              {...register('supplier_name')}
              placeholder="Supplier name"
            />
          </div>

          <div>
            <Label htmlFor="invoice_number">Invoice Number</Label>
            <Input
              {...register('invoice_number')}
              placeholder="Invoice number"
            />
          </div>

          <div>
            <Label htmlFor="transaction_date">Date</Label>
            <Input
              type="date"
              {...register('transaction_date', { required: true })}
            />
          </div>

          <div>
            <Label>Total Cost</Label>
            <div className="text-lg font-semibold text-green-600">
              ₹{((Number(quantity) || 0) * (Number(unitCost) || 0)).toFixed(2)}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} placeholder="Additional notes" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (selectedTransaction ? 'Updating...' : 'Recording...') : (selectedTransaction ? 'Update Transaction' : 'Record Transaction')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
