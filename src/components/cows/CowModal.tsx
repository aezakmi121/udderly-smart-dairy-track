import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface CowModalProps {
  selectedCow?: any;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isUploading: boolean;
  handleImageUpload: (file: File, cowId?: string) => Promise<string>;
  setSelectedCow: (cow: any) => void;
}

export const CowModal: React.FC<CowModalProps> = ({
  selectedCow,
  onSubmit,
  isLoading,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  isUploading,
  handleImageUpload,
  setSelectedCow
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Cow
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedCow ? 'Edit Cow' : 'Add New Cow'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cow_number">Cow Number *</Label>
              <Input
                id="cow_number"
                name="cow_number"
                defaultValue={selectedCow?.cow_number || ''}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                name="breed"
                defaultValue={selectedCow?.breed || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date_of_birth">Date of Birth</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={selectedCow?.date_of_birth || ''}
              />
            </div>
            
            <div>
              <Label htmlFor="date_of_arrival">Date of Arrival *</Label>
              <Input
                id="date_of_arrival"
                name="date_of_arrival"
                type="date"
                defaultValue={selectedCow?.date_of_arrival || ''}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={selectedCow?.status || 'active'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="dry">Dry</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="estimated_milk_capacity">Est. Milk Capacity (L)</Label>
              <Input
                id="estimated_milk_capacity"
                name="estimated_milk_capacity"
                type="number"
                step="0.1"
                defaultValue={selectedCow?.estimated_milk_capacity || ''}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="image">Cow Image</Label>
            <div className="mt-2">
              {selectedCow?.image_url && (
                <img 
                  src={selectedCow.image_url} 
                  alt="Cow" 
                  className="w-24 h-24 object-cover rounded-lg mb-2"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedCow) {
                    const imageUrl = await handleImageUpload(file, selectedCow.id);
                    setSelectedCow({ ...selectedCow, image_url: imageUrl });
                  }
                }}
                disabled={isUploading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={selectedCow?.notes || ''}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {selectedCow ? 'Update' : 'Add'} Cow
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};