import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MilkCollectionForm } from './MilkCollectionForm';
import { Plus } from 'lucide-react';

interface MilkCollectionModalProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: any;
  title?: string;
  selectedDate: string;
  selectedSession: 'morning' | 'evening';
}

export const MilkCollectionModal: React.FC<MilkCollectionModalProps> = ({
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  initialData,
  title = 'Add Milk Collection Record',
  selectedDate,
  selectedSession
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const handleSubmit = (data: any) => {
    
    onSubmit(data);
    // Don't close modal here - let the mutation success handler close it
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update milk collection record' : 'Record milk collection from farmers'}
          </DialogDescription>
        </DialogHeader>
        <MilkCollectionForm onSubmit={handleSubmit} isLoading={isLoading} initialData={initialData} selectedDate={selectedDate} selectedSession={selectedSession} />
      </DialogContent>
    </Dialog>
  );
};