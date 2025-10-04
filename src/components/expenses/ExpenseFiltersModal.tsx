import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useExpenseManagement, type ExpenseFilters } from '@/hooks/useExpenseManagement';

interface ExpenseFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ExpenseFilters;
  onFiltersChange: (filters: ExpenseFilters) => void;
}

export const ExpenseFiltersModal: React.FC<ExpenseFiltersModalProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}) => {
  const { useCategories, useSources } = useExpenseManagement();
  const { data: categories = [] } = useCategories();
  const { data: sources = [] } = useSources();

  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    const clearedFilters: ExpenseFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onOpenChange(false);
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategories = localFilters.categoryIds || [];
    const updatedCategories = checked
      ? [...currentCategories, categoryId]
      : currentCategories.filter(id => id !== categoryId);
    
    setLocalFilters({
      ...localFilters,
      categoryIds: updatedCategories.length > 0 ? updatedCategories : undefined,
    });
  };

  const handleSourceChange = (sourceId: string, checked: boolean) => {
    const currentSources = localFilters.sourceIds || [];
    const updatedSources = checked
      ? [...currentSources, sourceId]
      : currentSources.filter(id => id !== sourceId);
    
    setLocalFilters({
      ...localFilters,
      sourceIds: updatedSources.length > 0 ? updatedSources : undefined,
    });
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatuses = localFilters.status || [];
    const updatedStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    setLocalFilters({
      ...localFilters,
      status: updatedStatuses.length > 0 ? updatedStatuses : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filter Expenses</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Date Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFilters.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.startDate ? format(new Date(localFilters.startDate), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={localFilters.startDate ? new Date(localFilters.startDate) : undefined}
                      onSelect={(date) => {
                        setLocalFilters({
                          ...localFilters,
                          startDate: date ? format(date, 'yyyy-MM-dd') : undefined,
                        });
                        setStartDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !localFilters.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {localFilters.endDate ? format(new Date(localFilters.endDate), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={localFilters.endDate ? new Date(localFilters.endDate) : undefined}
                      onSelect={(date) => {
                        setLocalFilters({
                          ...localFilters,
                          endDate: date ? format(date, 'yyyy-MM-dd') : undefined,
                        });
                        setEndDateOpen(false);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Categories</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={(localFilters.categoryIds || []).includes(category.id)}
                    onCheckedChange={(checked) => handleCategoryChange(category.id, !!checked)}
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Sources</Label>
            <div className="grid grid-cols-2 gap-2">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`source-${source.id}`}
                    checked={(localFilters.sourceIds || []).includes(source.id)}
                    onCheckedChange={(checked) => handleSourceChange(source.id, !!checked)}
                  />
                  <Label
                    htmlFor={`source-${source.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {source.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {['pending', 'paid', 'overdue', 'cancelled'].map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={(localFilters.status || []).includes(status)}
                    onCheckedChange={(checked) => handleStatusChange(status, !!checked)}
                  />
                  <Label
                    htmlFor={`status-${status}`}
                    className="text-sm font-normal cursor-pointer capitalize"
                  >
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Amount Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Amount</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={localFilters.minAmount || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    minAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Amount</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={localFilters.maxAmount || ''}
                  onChange={(e) => setLocalFilters({
                    ...localFilters,
                    maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                  })}
                />
              </div>
            </div>
          </div>

          {/* Paid By */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Paid By</Label>
            <Input
              placeholder="Search by person who made payment"
              value={localFilters.paidBy || ''}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                paidBy: e.target.value || undefined,
              })}
            />
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear All
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};