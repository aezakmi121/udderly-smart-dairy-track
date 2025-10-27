import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface StoreReceiptFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const StoreReceiptForm: React.FC<StoreReceiptFormProps> = ({
  initialData,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: initialData || {
      cow_received: 0,
      buffalo_received: 0,
      mixed_received: 0,
      notes: ''
    }
  });

  const cowReceived = Number(watch('cow_received') || 0);
  const buffaloReceived = Number(watch('buffalo_received') || 0);
  const mixedReceived = Number(watch('mixed_received') || 0);
  const totalReceived = cowReceived + buffaloReceived + mixedReceived;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Cow Milk Received (L)</Label>
          <Input type="number" step="0.01" {...register('cow_received')} />
        </div>
        <div>
          <Label>Buffalo Milk Received (L)</Label>
          <Input type="number" step="0.01" {...register('buffalo_received')} />
        </div>
        <div>
          <Label>Mixed Milk Received (L)</Label>
          <Input type="number" step="0.01" {...register('mixed_received')} />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">
          Total Received: <span className="text-xl font-bold">{totalReceived.toFixed(2)} L</span>
        </p>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea {...register('notes')} placeholder="Any discrepancies or notes..." />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : initialData ? 'Update Receipt' : 'Add Receipt'}
      </Button>
    </form>
  );
};

export default StoreReceiptForm;
