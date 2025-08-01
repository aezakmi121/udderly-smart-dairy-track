import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Filter, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MilkCollectionFiltersProps {
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  onClearFilters: () => void;
}

export const MilkCollectionFilters: React.FC<MilkCollectionFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  onClearFilters
}) => {
  const [open, setOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState(dateRange);

  const hasActiveFilters = dateRange.from !== '' || dateRange.to !== '';

  const getQuickDateRange = (type: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (type) {
      case 'today':
        return {
          from: today.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        return {
          from: yesterday.toISOString().split('T')[0],
          to: yesterday.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return {
          from: weekStart.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          from: monthStart.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      default:
        return { from: '', to: '' };
    }
  };

  const handleQuickFilter = (type: string) => {
    const range = getQuickDateRange(type);
    setTempRange(range);
    onDateRangeChange(range);
    setOpen(false);
  };

  const handleApplyFilters = () => {
    onDateRangeChange(tempRange);
    setOpen(false);
  };

  const handleClearAll = () => {
    const clearRange = { from: '', to: '' };
    setTempRange(clearRange);
    onClearFilters();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {hasActiveFilters && (
            <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Collection Records
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Filters</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter('today')}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter('yesterday')}>
                Yesterday
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter('week')}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickFilter('month')}>
                This Month
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Date Range</Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="from-date" className="text-xs text-muted-foreground">From Date</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={tempRange.from}
                  onChange={(e) => setTempRange({ ...tempRange, from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="text-xs text-muted-foreground">To Date</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={tempRange.to}
                  onChange={(e) => setTempRange({ ...tempRange, to: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {hasActiveFilters && (
              <Button variant="outline" onClick={handleClearAll} className="flex-1">
                Clear All
              </Button>
            )}
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};