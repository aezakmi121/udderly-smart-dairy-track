
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MilkRateFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const MilkRateForm: React.FC<MilkRateFormProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      rate_per_liter: '',
      effective_from: new Date().toISOString().split('T')[0]
    }
  });

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      rate_per_liter: Number(data.rate_per_liter),
      // Set default values for fat/SNF ranges to maintain database compatibility
      fat_min: 0,
      fat_max: 100,
      snf_min: 0,
      snf_max: 100,
      is_active: true
    });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Rate Setting</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rate_per_liter">Rate per Liter (₹)</Label>
            <Input
              type="number"
              step="0.01"
              {...register('rate_per_liter', { required: true })}
              placeholder="Enter rate per liter"
            />
          </div>

          <div>
            <Label htmlFor="effective_from">Effective From</Label>
            <Input
              type="date"
              {...register('effective_from', { required: true })}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Rate Setting'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
