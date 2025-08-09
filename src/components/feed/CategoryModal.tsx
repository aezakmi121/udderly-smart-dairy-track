import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CategoryForm } from './CategoryForm';
import { Plus } from 'lucide-react';

interface CategoryModalProps {
  selectedCategory?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  selectedCategory,
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const handleSubmit = (data: any) => {
    onSubmit(data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>{selectedCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <CategoryForm selectedCategory={selectedCategory} onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
};