
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
      fat_min: '',
      fat_max: '',
      snf_min: '',
      snf_max: '',
      rate_per_liter: '',
      effective_from: new Date().toISOString().split('T')[0]
    }
  });

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      fat_min: Number(data.fat_min),
      fat_max: Number(data.fat_max),
      snf_min: Number(data.snf_min),
      snf_max: Number(data.snf_max),
      rate_per_liter: Number(data.rate_per_liter),
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="fat_min">Fat Min %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('fat_min', { required: true })}
              placeholder="Min fat %"
            />
          </div>

          <div>
            <Label htmlFor="fat_max">Fat Max %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('fat_max', { required: true })}
              placeholder="Max fat %"
            />
          </div>

          <div>
            <Label htmlFor="snf_min">SNF Min %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('snf_min', { required: true })}
              placeholder="Min SNF %"
            />
          </div>

          <div>
            <Label htmlFor="snf_max">SNF Max %</Label>
            <Input
              type="number"
              step="0.1"
              {...register('snf_max', { required: true })}
              placeholder="Max SNF %"
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
            <Label htmlFor="effective_from">Effective From</Label>
            <Input
              type="date"
              {...register('effective_from', { required: true })}
            />
          </div>

          <div className="md:col-span-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Rate Setting'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
