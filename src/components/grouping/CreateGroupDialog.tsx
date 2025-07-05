
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCowGrouping } from '@/hooks/useCowGrouping';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    min_yield: '',
    max_yield: '',
    min_days_in_milk: '',
    max_days_in_milk: '',
    silage: '',
    concentrate: '',
    roughage: ''
  });

  const { createGroupMutation } = useCowGrouping();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const feedRequirements: any = {};
    if (formData.silage) feedRequirements.silage = parseFloat(formData.silage);
    if (formData.concentrate) feedRequirements.concentrate = parseFloat(formData.concentrate);
    if (formData.roughage) feedRequirements.roughage = parseFloat(formData.roughage);

    const groupData = {
      group_name: formData.group_name,
      description: formData.description || null,
      min_yield: formData.min_yield ? parseFloat(formData.min_yield) : null,
      max_yield: formData.max_yield ? parseFloat(formData.max_yield) : null,
      min_days_in_milk: formData.min_days_in_milk ? parseInt(formData.min_days_in_milk) : null,
      max_days_in_milk: formData.max_days_in_milk ? parseInt(formData.max_days_in_milk) : null,
      feed_requirements: Object.keys(feedRequirements).length > 0 ? feedRequirements : null
    };

    try {
      await createGroupMutation.mutateAsync(groupData);
      onOpenChange(false);
      setFormData({
        group_name: '',
        description: '',
        min_yield: '',
        max_yield: '',
        min_days_in_milk: '',
        max_days_in_milk: '',
        silage: '',
        concentrate: '',
        roughage: ''
      });
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Cow Group</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="group_name">Group Name *</Label>
            <Input
              id="group_name"
              value={formData.group_name}
              onChange={(e) => handleChange('group_name', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional description for this group"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_yield">Min Yield (L/day)</Label>
              <Input
                id="min_yield"
                type="number"
                step="0.1"
                value={formData.min_yield}
                onChange={(e) => handleChange('min_yield', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="max_yield">Max Yield (L/day)</Label>
              <Input
                id="max_yield"
                type="number"
                step="0.1"
                value={formData.max_yield}
                onChange={(e) => handleChange('max_yield', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_days_in_milk">Min Days in Milk</Label>
              <Input
                id="min_days_in_milk"
                type="number"
                value={formData.min_days_in_milk}
                onChange={(e) => handleChange('min_days_in_milk', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="max_days_in_milk">Max Days in Milk</Label>
              <Input
                id="max_days_in_milk"
                type="number"
                value={formData.max_days_in_milk}
                onChange={(e) => handleChange('max_days_in_milk', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Daily Feed Requirements (kg)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="silage" className="text-xs">Silage</Label>
                <Input
                  id="silage"
                  type="number"
                  step="0.1"
                  placeholder="kg"
                  value={formData.silage}
                  onChange={(e) => handleChange('silage', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="concentrate" className="text-xs">Concentrate</Label>
                <Input
                  id="concentrate"
                  type="number"
                  step="0.1"
                  placeholder="kg"
                  value={formData.concentrate}
                  onChange={(e) => handleChange('concentrate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="roughage" className="text-xs">Roughage</Label>
                <Input
                  id="roughage"
                  type="number"
                  step="0.1"
                  placeholder="kg"
                  value={formData.roughage}
                  onChange={(e) => handleChange('roughage', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
