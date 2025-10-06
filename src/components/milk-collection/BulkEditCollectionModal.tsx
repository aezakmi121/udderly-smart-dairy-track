import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';

interface BulkEditCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { collection_date: string; session: 'morning' | 'evening' }) => void;
  isLoading: boolean;
  selectedCount: number;
}

export const BulkEditCollectionModal: React.FC<BulkEditCollectionModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  selectedCount
}) => {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      collection_date: new Date().toISOString().split('T')[0],
      session: 'morning' as 'morning' | 'evening'
    }
  });

  const selectedSession = watch('session');

  const handleFormSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Collections</DialogTitle>
          <DialogDescription>
            Update date and session for {selectedCount} selected collection{selectedCount !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="collection_date">Collection Date</Label>
            <Input
              id="collection_date"
              type="date"
              {...register('collection_date', { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>Session</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={selectedSession === 'morning' ? 'default' : 'outline'}
                onClick={() => setValue('session', 'morning')}
                className="flex-1"
              >
                Morning
              </Button>
              <Button
                type="button"
                variant={selectedSession === 'evening' ? 'default' : 'outline'}
                onClick={() => setValue('session', 'evening')}
                className="flex-1"
              >
                Evening
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : `Update ${selectedCount} Record${selectedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
