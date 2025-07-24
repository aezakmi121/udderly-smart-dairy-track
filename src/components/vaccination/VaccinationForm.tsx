
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useCows } from '@/hooks/useCows';
import { useVaccination } from '@/hooks/useVaccination';

interface VaccinationFormProps {
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const VaccinationForm: React.FC<VaccinationFormProps> = ({ onSubmit, isLoading }) => {
  const [selectedCows, setSelectedCows] = React.useState<string[]>([]);
  const [showCowSelection, setShowCowSelection] = React.useState(false);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
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
    if (selectedCows.length === 0) {
      alert('Please select at least one cow for vaccination.');
      return;
    }
    
    // Create vaccination records for each selected cow
    selectedCows.forEach(cowId => {
      onSubmit({ ...data, cow_id: cowId });
    });
    
    reset();
    setSelectedCows([]);
  };

  const toggleCowSelection = (cowId: string) => {
    setSelectedCows(prev => 
      prev.includes(cowId) 
        ? prev.filter(id => id !== cowId)
        : [...prev, cowId]
    );
  };

  const removeCow = (cowId: string) => {
    setSelectedCows(prev => prev.filter(id => id !== cowId));
  };

  const getSelectedCowNumbers = () => {
    return cows?.filter(cow => selectedCows.includes(cow.id)).map(cow => cow.cow_number) || [];
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add Vaccination Record</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 gap-4">
          {/* Multiple Cow Selection */}
          <div>
            <Label>Selected Cows ({selectedCows.length})</Label>
            <div className="min-h-[60px] border rounded-md p-3 bg-gray-50">
              {selectedCows.length === 0 ? (
                <p className="text-gray-500 text-sm">No cows selected</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {getSelectedCowNumbers().map((cowNumber, index) => (
                    <Badge key={selectedCows[index]} variant="secondary" className="flex items-center gap-1">
                      {cowNumber}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeCow(selectedCows[index])}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setShowCowSelection(!showCowSelection)}
            >
              {showCowSelection ? 'Hide' : 'Select'} Cows
            </Button>
          </div>

          {/* Cow Selection Dropdown */}
          {showCowSelection && (
            <Card className="p-4 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {cows?.map((cow) => (
                  <div key={cow.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={cow.id}
                      checked={selectedCows.includes(cow.id)}
                      onCheckedChange={() => toggleCowSelection(cow.id)}
                    />
                    <label htmlFor={cow.id} className="text-sm cursor-pointer">
                      {cow.cow_number}
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} placeholder="Additional notes" />
          </div>

          <div>
            <Button type="submit" disabled={isLoading || selectedCows.length === 0}>
              {isLoading ? 'Adding...' : `Add Vaccination Records (${selectedCows.length} cows)`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
