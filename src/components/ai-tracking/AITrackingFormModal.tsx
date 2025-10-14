import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAICows } from '@/hooks/useCows';
import { useAITracking } from '@/hooks/useAITracking';
import { PDUpdateDialog } from './PDUpdateDialog';

interface AITrackingFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const AITrackingFormModal: React.FC<AITrackingFormModalProps> = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}) => {
  const { register, handleSubmit, setValue, reset, watch } = useForm({
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

  const { cows } = useAICows();
  const { getNextServiceNumber, canAddAIRecord, updateAIRecordMutation } = useAITracking();
  const selectedCowId = watch('cow_id');
  
  const [showPDDialog, setShowPDDialog] = useState(false);
  const [blockingRecord, setBlockingRecord] = useState<any>(null);
  const [pendingFormData, setPendingFormData] = useState<any>(null);

  useEffect(() => {
    if (selectedCowId) {
      getNextServiceNumber(selectedCowId).then(nextServiceNumber => {
        setValue('service_number', nextServiceNumber);
      });
    }
  }, [selectedCowId, getNextServiceNumber, setValue]);

  const handleFormSubmit = async (data: any) => {
    const formData = {
      ...data,
      service_number: Number(data.service_number)
    };

    // Check if we can add the AI record
    if (data.cow_id) {
      const validation = await canAddAIRecord(data.cow_id);
      if (!validation.canAdd && validation.recordId) {
        // Store form data and show PD dialog
        setPendingFormData(formData);
        setBlockingRecord(validation.recordData);
        setShowPDDialog(true);
        return;
      }
    }

    // If validation passed, submit the form
    onSubmit(formData);
    reset();
    onOpenChange(false);
  };

  const handlePDUpdate = (recordId: string, updates: any) => {
    updateAIRecordMutation.mutate(
      { id: recordId, ...updates },
      {
        onSuccess: () => {
          setShowPDDialog(false);
          setBlockingRecord(null);
          
          // After successful PD update, submit the pending form
          if (pendingFormData) {
            onSubmit(pendingFormData);
            setPendingFormData(null);
            reset();
            onOpenChange(false);
          }
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add AI Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <Label htmlFor="cow_id">Cow</Label>
            <Select onValueChange={(value) => setValue('cow_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a cow" />
              </SelectTrigger>
              <SelectContent className="bg-white">
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
            <Label htmlFor="service_number">Service Number (Auto)</Label>
            <Input
              type="number"
              min="1"
              readOnly
              className="bg-muted"
              {...register('service_number', { required: true })}
            />
          </div>

          <div>
            <Label htmlFor="ai_status">Status</Label>
            <Select onValueChange={(value) => setValue('ai_status', value)} defaultValue="done">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
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

          <div className="md:col-span-2 flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add AI Record'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
      
      <PDUpdateDialog
        open={showPDDialog}
        onOpenChange={setShowPDDialog}
        record={blockingRecord}
        onUpdate={handlePDUpdate}
        isLoading={updateAIRecordMutation.isPending}
      />
    </Dialog>
  );
};