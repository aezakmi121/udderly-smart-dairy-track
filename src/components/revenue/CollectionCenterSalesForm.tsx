import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CollectionCenterSalesFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const CollectionCenterSalesForm = ({ initialData, onSubmit, isLoading }: CollectionCenterSalesFormProps) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      sale_date: new Date().toISOString().split('T')[0],
      customer_name: '',
      quantity: '',
      rate_per_liter: '',
      payment_status: 'unpaid',
      payment_month: new Date().toISOString().slice(0, 7) + '-01',
      notes: ''
    }
  });

  const quantity = watch('quantity') || 0;
  const ratePerLiter = watch('rate_per_liter') || 0;
  const totalAmount = Number(quantity) * Number(ratePerLiter);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sale_date">Sale Date *</Label>
          <Input
            id="sale_date"
            type="date"
            {...register('sale_date', { required: 'Sale date is required' })}
          />
          {errors.sale_date && <span className="text-sm text-destructive">{errors.sale_date.message as string}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_name">Customer Name *</Label>
          <Input
            id="customer_name"
            {...register('customer_name', { required: 'Customer name is required' })}
            placeholder="Enter customer name"
          />
          {errors.customer_name && <span className="text-sm text-destructive">{errors.customer_name.message as string}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity (Liters) *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.1"
            {...register('quantity', { required: 'Quantity is required', min: 0.1 })}
          />
          {errors.quantity && <span className="text-sm text-destructive">{errors.quantity.message as string}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rate_per_liter">Rate per Liter (₹) *</Label>
          <Input
            id="rate_per_liter"
            type="number"
            step="0.01"
            {...register('rate_per_liter', { required: 'Rate is required', min: 0 })}
          />
          {errors.rate_per_liter && <span className="text-sm text-destructive">{errors.rate_per_liter.message as string}</span>}
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
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
