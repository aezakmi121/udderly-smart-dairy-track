import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

interface FilterModalProps {
  children: React.ReactNode;
  title: string;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  children,
  title,
  onClearFilters,
  hasActiveFilters,
  open: externalOpen,
  onOpenChange: externalOnOpenChange
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {title}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {children}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};