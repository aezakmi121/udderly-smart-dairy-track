import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WeightLogForm } from './WeightLogForm';
import { Plus } from 'lucide-react';

interface WeightLogModalProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const handleSubmit = (data: any) => {
    console.log('Submitting weight log:', data);
    onSubmit(data);
    // Don't close modal here - let the mutation success handler close it
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Weight Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Add Weight Log</DialogTitle>
          <DialogDescription>
            Record weight measurements for cattle health monitoring
          </DialogDescription>
        </DialogHeader>
        <WeightLogForm onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
};