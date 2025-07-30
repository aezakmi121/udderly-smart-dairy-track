import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalfForm } from './CalfForm';
import { Plus } from 'lucide-react';

interface CalfModalProps {
  selectedCalf?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  setSelectedCalf: (calf: any) => void;
  onCancel: () => void;
}

export const CalfModal: React.FC<CalfModalProps> = ({
  selectedCalf,
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  setSelectedCalf,
  onCancel
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Calf
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedCalf ? 'Edit Calf' : 'Add New Calf'}
          </DialogTitle>
        </DialogHeader>
        
        <CalfForm
          selectedCalf={selectedCalf}
          setSelectedCalf={setSelectedCalf}
          onSubmit={onSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
};