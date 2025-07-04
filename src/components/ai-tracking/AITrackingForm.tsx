
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCows } from '@/hooks/useCows';

interface AITrackingFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const AITrackingForm: React.FC<AITrackingFormProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, setValue, reset } = useForm({
    defaultValues: {
      cow_id: '',
      service_number: 1,
      ai_date: new Date().toISOString().split('T')[0],
      ai_status: 'done',
      semen_batch: '',
      technician_name: '',
      notes: ''
    }
  });

  const { cows } = useCows();

  const handleFormSubmit = (data: any) => {
    onSubmit({
      ...data,
      service_number: Number(data.service_number)
    });
    reset();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add AI Record</CardTitle>
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
            <Label htmlFor="ai_date">AI Date</Label>
            <Input
              type="date"
              {...register('ai_date', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="service_number">Service Number</Label>
            <Input
              type="number"
              min="1"
              {...register('service_number', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="ai_status">Status</Label>
            <Select onValueChange={(value) => setValue('ai_status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="semen_batch">Semen Batch</Label>
            <Input {...register('semen_batch')} placeholder="Semen batch number" />
          </div>

          <div>
            <Label htmlFor="technician_name">Technician Name</Label>
            <Input {...register('technician_name')} placeholder="AI technician name" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} placeholder="Additional notes" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add AI Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
