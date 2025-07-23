import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WeightLogForm } from './WeightLogForm';
import { Plus } from 'lucide-react';

interface WeightLogModalProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  onSubmit,
  isLoading
}) => {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: any) => {
    onSubmit(data);
    setOpen(false);
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
        </DialogHeader>
        <WeightLogForm onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
};