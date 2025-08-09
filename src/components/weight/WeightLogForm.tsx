
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCows } from '@/hooks/useCows';

interface WeightLogFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const WeightLogForm: React.FC<WeightLogFormProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      cow_id: '',
      heart_girth: '',
      body_length: '',
      log_date: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  const { cows } = useCows();
  const heartGirth = watch('heart_girth');
  const bodyLength = watch('body_length');

  // Reset form dates when component mounts
  React.useEffect(() => {
    setValue('log_date', new Date().toISOString().split('T')[0]);
  }, [setValue]);

  const calculateWeight = () => {
    if (heartGirth && bodyLength) {
      return ((Number(heartGirth) * Number(heartGirth) * Number(bodyLength)) / 300).toFixed(1);
    }
    return '0';
  };

  const handleFormSubmit = (data: any) => {
    const calculatedWeight = calculateWeight();
    onSubmit({
      ...data,
      heart_girth: Number(data.heart_girth),
      body_length: Number(data.body_length),
      calculated_weight: Number(calculatedWeight)
    });
    reset();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Weight Log</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cow_id">Cow</Label>
            <Select onValueChange={(value) => setValue('cow_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a cow" />
              </SelectTrigger>
              <SelectContent>
                {cows?.map((cow) => (
                  <SelectItem key={cow.id} value={cow.id}>
                    {cow.cow_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="log_date">Log Date</Label>
            <Input
              type="date"
              {...register('log_date', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="heart_girth">Heart Girth (cm)</Label>
            <Input
              type="number"
              step="0.1"
              {...register('heart_girth', { required: true })}
              placeholder="Heart girth measurement"
            />
          </div>

          <div>
            <Label htmlFor="body_length">Body Length (cm)</Label>
            <Input
              type="number"
              step="0.1"
              {...register('body_length', { required: true })}
              placeholder="Body length measurement"
            />
          </div>

          <div>
            <Label>Calculated Weight</Label>
            <div className="text-lg font-semibold text-green-600">
              {calculateWeight()} kg
            </div>
            <p className="text-sm text-muted-foreground">
              Using Schaeffer's formula
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} placeholder="Additional notes" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Weight Log'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
