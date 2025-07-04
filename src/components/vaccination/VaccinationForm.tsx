
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCows } from '@/hooks/useCows';
import { useVaccination } from '@/hooks/useVaccination';

interface VaccinationFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const VaccinationForm: React.FC<VaccinationFormProps> = ({ onSubmit, isLoading }) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      cow_id: '',
      vaccination_schedule_id: '',
      vaccination_date: new Date().toISOString().split('T')[0],
      next_due_date: '',
      batch_number: '',
      administered_by: '',
      notes: ''
    }
  });

  const { cows } = useCows();
  const { schedules } = useVaccination();

  const selectedSchedule = watch('vaccination_schedule_id');
  const vaccinationDate = watch('vaccination_date');

  React.useEffect(() => {
    if (selectedSchedule && vaccinationDate && schedules) {
      const schedule = schedules.find(s => s.id === selectedSchedule);
      if (schedule) {
        const nextDue = new Date(vaccinationDate);
        nextDue.setMonth(nextDue.getMonth() + schedule.frequency_months);
        setValue('next_due_date', nextDue.toISOString().split('T')[0]);
      }
    }
  }, [selectedSchedule, vaccinationDate, schedules, setValue]);

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
    reset();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Vaccination Record</CardTitle>
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
            <Label htmlFor="vaccination_schedule_id">Vaccine</Label>
            <Select onValueChange={(value) => setValue('vaccination_schedule_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select vaccine" />
              </SelectTrigger>
              <SelectContent>
                {schedules?.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.vaccine_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="vaccination_date">Vaccination Date</Label>
            <Input
              type="date"
              {...register('vaccination_date', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="next_due_date">Next Due Date</Label>
            <Input
              type="date"
              {...register('next_due_date', { required: true })}
              readOnly
            />
          </div>

          <div>
            <Label htmlFor="batch_number">Batch Number</Label>
            <Input {...register('batch_number')} placeholder="Vaccine batch number" />
          </div>

          <div>
            <Label htmlFor="administered_by">Administered By</Label>
            <Input {...register('administered_by')} placeholder="Veterinarian name" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} placeholder="Additional notes" />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Vaccination Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
