
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCows } from '@/hooks/useCows';

interface MilkProduction {
  id: string;
  cow_id?: string;
  production_date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat_percentage?: number;
  snf_percentage?: number;
  remarks?: string;
}

interface MilkProductionFormProps {
  selectedRecord: MilkProduction | null;
  selectedDate: string;
  defaultSession?: 'morning' | 'evening';
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const MilkProductionForm: React.FC<MilkProductionFormProps> = ({
  selectedRecord,
  selectedDate,
  defaultSession,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const { cows } = useCows();
  const selectedSession = selectedRecord?.session || defaultSession || 'morning';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const recordData = {
      cow_id: formData.get('cow_id') as string,
      production_date: selectedDate,
      session: selectedSession,
      quantity: parseFloat(formData.get('quantity') as string),
      fat_percentage: parseFloat(formData.get('fat_percentage') as string) || null,
      snf_percentage: parseFloat(formData.get('snf_percentage') as string) || null,
      remarks: formData.get('remarks') as string
    };

    onSubmit(recordData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="cow_id">Cow *</Label>
        <Select name="cow_id" defaultValue={selectedRecord?.cow_id} required>
          <SelectTrigger>
            <SelectValue placeholder="Select cow" />
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="production_date">Date </Label>
          <Input
            id="production_date"
            type="date"
            value={selectedDate}
            disabled
            readOnly
          />
          <input type="hidden" name="production_date" value={selectedDate} />
        </div>
        
        <div>
          <Label htmlFor="session">Session</Label>
          <Input id="session" value={selectedSession.charAt(0).toUpperCase() + selectedSession.slice(1)} readOnly disabled />
          <input type="hidden" name="session" value={selectedSession} />
        </div>
      </div>

      <div>
        <Label htmlFor="quantity">Quantity (Liters) *</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          step="0.001"
          defaultValue={selectedRecord?.quantity || ''}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fat_percentage">Fat % (optional)</Label>
          <Input
            id="fat_percentage"
            name="fat_percentage"
            type="number"
            step="0.1"
            defaultValue={selectedRecord?.fat_percentage || ''}
          />
        </div>
        
        <div>
          <Label htmlFor="snf_percentage">SNF % (optional)</Label>
          <Input
            id="snf_percentage"
            name="snf_percentage"
            type="number"
            step="0.1"
            defaultValue={selectedRecord?.snf_percentage || ''}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="remarks">Remarks</Label>
        <Textarea
          id="remarks"
          name="remarks"
          defaultValue={selectedRecord?.remarks || ''}
          rows={2}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {selectedRecord ? 'Update' : 'Add'} Record
        </Button>
      </div>
    </form>
  );
};
