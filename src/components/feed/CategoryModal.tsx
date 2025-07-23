import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CategoryForm } from './CategoryForm';
import { Plus } from 'lucide-react';

interface CategoryModalProps {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
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
          Add Category
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Add Feed Category</DialogTitle>
        </DialogHeader>
        <CategoryForm onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
};