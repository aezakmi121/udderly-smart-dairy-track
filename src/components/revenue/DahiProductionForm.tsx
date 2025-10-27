import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface DahiProductionFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const DahiProductionForm: React.FC<DahiProductionFormProps> = ({
  initialData,
  onSubmit,
  isLoading
}) => {
  const { register, handleSubmit, watch } = useForm({
    defaultValues: initialData || {
      production_date: format(new Date(), 'yyyy-MM-dd'),
      batch_number: '',
      ffm_used: 0,
      dahi_yield: 0,
      production_cost: 0,
      notes: ''
    }
  });

  const ffmUsed = Number(watch('ffm_used') || 0);
  const dahiYield = Number(watch('dahi_yield') || 0);
  const productionCost = Number(watch('production_cost') || 0);
  
  const conversionRate = ffmUsed > 0 ? (dahiYield / ffmUsed).toFixed(4) : '0';
  const costPerKg = dahiYield > 0 ? (productionCost / dahiYield).toFixed(2) : '0';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Production Date</Label>
          <Input type="date" {...register('production_date')} />
        </div>
        <div>
          <Label>Batch Number (Optional)</Label>
          <Input {...register('batch_number')} placeholder="e.g., DAHI-001" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>FFM Used (L)</Label>
          <Input type="number" step="0.01" {...register('ffm_used')} />
        </div>
        <div>
          <Label>Dahi Yield (kg)</Label>
          <Input type="number" step="0.01" {...register('dahi_yield')} />
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">
          Conversion Rate: <span className="text-xl font-bold">{conversionRate}</span>
          <span className="text-xs text-muted-foreground ml-2">(Dahi Yield / FFM Used)</span>
        </p>
      </div>

      <div>
        <Label>Production Cost (Optional)</Label>
        <Input type="number" step="0.01" {...register('production_cost')} placeholder="Total production cost" />
      </div>

      {productionCost > 0 && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            Cost per kg: <span className="text-xl font-bold">₹{costPerKg}</span>
          </p>
        </div>
      )}

      <div>
        <Label>Notes</Label>
        <Textarea {...register('notes')} placeholder="Any notes about this batch..." />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : initialData ? 'Update Production' : 'Add Production'}
      </Button>
    </form>
  );
};

export default DahiProductionForm;
