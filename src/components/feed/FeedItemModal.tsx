import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FeedItemForm } from './FeedItemForm';
import { Plus } from 'lucide-react';

interface FeedItemModalProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const FeedItemModal: React.FC<FeedItemModalProps> = ({
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
          Add Feed Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle>Add Feed Item</DialogTitle>
        </DialogHeader>
        <FeedItemForm onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
};