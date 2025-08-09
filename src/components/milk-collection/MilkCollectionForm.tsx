
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMilkCollection } from '@/hooks/useMilkCollection';
import { useMilkRateSettings } from '@/hooks/useMilkRateSettings';

interface MilkCollectionFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialData?: any;
}

export const MilkCollectionForm: React.FC<MilkCollectionFormProps> = ({ onSubmit, isLoading, initialData }) => {
  const [isAutoCalculation, setIsAutoCalculation] = React.useState(true);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: initialData ? {
      farmer_id: initialData.farmer_id || '',
      collection_date: initialData.collection_date || new Date().toISOString().split('T')[0],
      session: initialData.session || 'morning',
      quantity: initialData.quantity?.toString() || '',
      fat_percentage: initialData.fat_percentage?.toString() || '',
      snf_percentage: initialData.snf_percentage?.toString() || '',
      total_amount: initialData.total_amount?.toString() || '',
      is_accepted: initialData.is_accepted ?? true,
      remarks: initialData.remarks || ''
    } : {
      farmer_id: '',
      collection_date: new Date().toISOString().split('T')[0],
      session: 'morning',
      quantity: '',
      fat_percentage: '',
      snf_percentage: '',
      total_amount: '',
      is_accepted: true,
      remarks: ''
    }
  });

  const { farmers } = useMilkCollection();
  const { calculateRate } = useMilkRateSettings();
  
  const quantity = watch('quantity');
  const fatPercentage = watch('fat_percentage');
  const snfPercentage = watch('snf_percentage');
  const manualAmount = watch('total_amount');

  const calculatedRate = calculateRate(Number(fatPercentage) || 0, Number(snfPercentage) || 0);
  const totalAmount = isAutoCalculation 
    ? (Number(quantity) || 0) * calculatedRate
    : Number(manualAmount) || 0;
  const derivedRate = isAutoCalculation 
    ? calculatedRate 
    : (Number(quantity) > 0 ? totalAmount / Number(quantity) : 0);

  // Load calculation mode from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('milkRateCalculationMode');
    if (stored) {
      setIsAutoCalculation(stored === 'auto');
    }
  }, []);

  // Reset form dates when component mounts for new records
  React.useEffect(() => {
    if (!initialData) {
      setValue('collection_date', new Date().toISOString().split('T')[0]);
    }
  }, [initialData, setValue]);

  const handleFormSubmit = (data: any) => {
    const submitData = {
      ...data,
      quantity: Number(data.quantity),
      fat_percentage: Number(data.fat_percentage),
      snf_percentage: Number(data.snf_percentage),
      rate_per_liter: derivedRate,
      total_amount: totalAmount
    };
    
    if (initialData) {
      submitData.id = initialData.id;
    }
    
    onSubmit(submitData);
    if (!initialData) {
      reset();
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Record Milk Collection</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="farmer_id">Farmer</Label>
            <Select onValueChange={(value) => setValue('farmer_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers?.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.name} ({farmer.farmer_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="collection_date">Collection Date</Label>
            <Input
              type="date"
              {...register('collection_date', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="session">Session</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={watch('session') === 'morning' ? 'default' : 'outline'}
                onClick={() => setValue('session', 'morning')}
                className="flex-1"
              >
                Morning
              </Button>
              <Button
                type="button"
                variant={watch('session') === 'evening' ? 'default' : 'outline'}
                onClick={() => setValue('session', 'evening')}
                className="flex-1"
              >
                Evening
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="quantity">Quantity (Liters)</Label>
            <Input
              type="number"
              step="0.1"
              {...register('quantity', { required: true })}
              placeholder="Milk quantity"
            />
          </div>

          <div>
            <Label htmlFor="fat_percentage">Fat %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('fat_percentage', { required: true })}
              placeholder="Fat percentage"
            />
            <p className="text-xs text-muted-foreground mt-1">For record keeping only</p>
          </div>

          <div>
            <Label htmlFor="snf_percentage">SNF %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('snf_percentage', { required: true })}
              placeholder="SNF percentage"
            />
            <p className="text-xs text-muted-foreground mt-1">For record keeping only</p>
          </div>

          {isAutoCalculation ? (
            <>
              <div>
                <Label>Rate per Liter</Label>
                <div className="text-lg font-medium text-blue-600">
                  ₹{calculatedRate.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Based on current rate setting</p>
              </div>

              <div>
                <Label>Total Amount</Label>
                <div className="text-lg font-semibold text-green-600">
                  ₹{totalAmount.toFixed(2)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="total_amount">Total Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('total_amount', { required: true })}
                  placeholder="Enter total amount"
                />
              </div>

              <div>
                <Label>Calculated Rate</Label>
                <div className="text-lg font-medium text-blue-600">
                  ₹{derivedRate.toFixed(2)}/L
                </div>
                <p className="text-xs text-muted-foreground">Rate = Amount ÷ Quantity</p>
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea {...register('remarks')} placeholder="Additional remarks" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (initialData ? 'Updating...' : 'Recording...') : (initialData ? 'Update Collection' : 'Record Collection')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
