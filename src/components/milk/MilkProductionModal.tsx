import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MilkProductionForm } from './MilkProductionForm';
import { Plus } from 'lucide-react';

interface MilkProductionModalProps {
  selectedRecord?: any;
  selectedDate: string;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCancel: () => void;
}

export const MilkProductionModal: React.FC<MilkProductionModalProps> = ({
  selectedRecord,
  selectedDate,
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onCancel
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedRecord ? 'Edit Production Record' : 'Add Production Record'}
          </DialogTitle>
        </DialogHeader>
        
        <MilkProductionForm
          selectedRecord={selectedRecord}
          selectedDate={selectedDate}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};