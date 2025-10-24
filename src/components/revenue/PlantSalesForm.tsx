import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PlantSalesFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const PlantSalesForm = ({ initialData, onSubmit, isLoading }: PlantSalesFormProps) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      sale_date: new Date().toISOString().split('T')[0],
      quantity: '',
      fat_percentage: '',
      snf_percentage: '',
      amount_received: '',
      payment_status: 'paid',
      payment_date: new Date().toISOString().split('T')[0],
      slip_number: '',
      notes: ''
    }
  });

  const paymentStatus = watch('payment_status');

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
          <Label htmlFor="fat_percentage">Fat % *</Label>
          <Input
            id="fat_percentage"
            type="number"
            step="0.1"
            {...register('fat_percentage', { required: 'Fat percentage is required', min: 0 })}
          />
          {errors.fat_percentage && <span className="text-sm text-destructive">{errors.fat_percentage.message as string}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="snf_percentage">SNF %</Label>
          <Input
            id="snf_percentage"
            type="number"
            step="0.1"
            {...register('snf_percentage', { min: 0 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount_received">Amount Received (₹) *</Label>
          <Input
            id="amount_received"
            type="number"
            step="0.01"
            {...register('amount_received', { required: 'Amount is required', min: 0 })}
          />
          {errors.amount_received && <span className="text-sm text-destructive">{errors.amount_received.message as string}</span>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_status">Payment Status *</Label>
          <Select
            value={paymentStatus}
            onValueChange={(value) => setValue('payment_status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentStatus === 'paid' && (
          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date</Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="slip_number">Slip Number</Label>
          <Input
            id="slip_number"
            {...register('slip_number')}
            placeholder="Optional"
          />
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
