
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMilkCollection } from '@/hooks/useMilkCollection';

interface MilkCollectionFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const MilkCollectionForm: React.FC<MilkCollectionFormProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      farmer_id: '',
      collection_date: new Date().toISOString().split('T')[0],
      session: 'morning',
      quantity: '',
      fat_percentage: '',
      snf_percentage: '',
      rate_per_liter: '',
      is_accepted: true,
      remarks: ''
    }
  });

  const { farmers } = useMilkCollection();
  const quantity = watch('quantity');
  const ratePerLiter = watch('rate_per_liter');

  const calculateTotal = () => {
    if (quantity && ratePerLiter) {
      return (Number(quantity) * Number(ratePerLiter)).toFixed(2);
    }
    return '0.00';
  };

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      quantity: Number(data.quantity),
      fat_percentage: Number(data.fat_percentage),
      snf_percentage: Number(data.snf_percentage),
      rate_per_liter: Number(data.rate_per_liter)
    });
    reset();
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
            <Select onValueChange={(value) => setValue('session', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectContent>
            </Select>
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
          </div>

          <div>
            <Label htmlFor="snf_percentage">SNF %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('snf_percentage', { required: true })}
              placeholder="SNF percentage"
            />
          </div>

          <div>
            <Label htmlFor="rate_per_liter">Rate per Liter</Label>
            <Input
              type="number"
              step="0.01"
              {...register('rate_per_liter', { required: true })}
              placeholder="Rate per liter"
            />
          </div>

          <div>
            <Label>Total Amount</Label>
            <div className="text-lg font-semibold text-green-600">
              ₹{calculateTotal()}
            </div>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea {...register('remarks')} placeholder="Additional remarks" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Recording...' : 'Record Collection'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
