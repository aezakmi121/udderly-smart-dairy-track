import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';

interface StoreSalesFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const StoreSalesForm = ({ initialData, onSubmit, isLoading }: StoreSalesFormProps) => {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      sale_date: new Date().toISOString().split('T')[0],
      cash_amount: 0,
      upi_amount: 0,
      credit_amount: 0,
      notes: ''
    }
  });

  const cashAmount = watch('cash_amount') || 0;
  const upiAmount = watch('upi_amount') || 0;
  const creditAmount = watch('credit_amount') || 0;

  const totalAmount = Number(cashAmount) + Number(upiAmount) + Number(creditAmount);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sale_date">Sale Date *</Label>
        <Input
          id="sale_date"
          type="date"
          {...register('sale_date', { required: 'Sale date is required' })}
        />
        {errors.sale_date && <span className="text-sm text-destructive">{errors.sale_date.message as string}</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cash_amount">Cash (₹)</Label>
          <Input
            id="cash_amount"
            type="number"
            step="0.01"
            {...register('cash_amount', { min: 0 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="upi_amount">UPI (₹)</Label>
          <Input
            id="upi_amount"
            type="number"
            step="0.01"
            {...register('upi_amount', { min: 0 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="credit_amount">Credit (₹)</Label>
          <Input
            id="credit_amount"
            type="number"
            step="0.01"
            {...register('credit_amount', { min: 0 })}
          />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Any additional notes..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Add Sale'}
        </Button>
      </div>
    </form>
  );
};
