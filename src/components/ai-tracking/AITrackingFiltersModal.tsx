import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import { useAICows } from '@/hooks/useCows';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface AITrackingFiltersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: {
    startDate: string;
    endDate: string;
    cowId: string;
    status: string;
    pdStatus: string;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
}

export const AITrackingFiltersModal: React.FC<AITrackingFiltersModalProps> = ({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onReset
}) => {
  const { cows } = useAICows();

  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const setQuickDateRange = (type: 'week' | 'month' | '7days' | '30days') => {
    const today = new Date();
    let from: Date, to: Date;

    switch (type) {
      case 'week':
        from = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        to = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case '7days':
        from = subDays(today, 7);
        to = today;
        break;
      case '30days':
        from = subDays(today, 30);
        to = today;
        break;
    }

    onFiltersChange({
      ...filters,
      startDate: format(from, 'yyyy-MM-dd'),
      endDate: format(to, 'yyyy-MM-dd')
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== 'all').length;
  };

  const handleReset = () => {
    onReset();
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            AI Tracking Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Date Range Buttons */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Quick Date Ranges</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('week')}
                className="justify-start"
              >
                <Calendar className="h-3 w-3 mr-1" />
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('month')}
                className="justify-start"
              >
                <Calendar className="h-3 w-3 mr-1" />
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('7days')}
                className="justify-start"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange('30days')}
                className="justify-start"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Last 30 Days
              </Button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Other Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cowId">Cow</Label>
              <Select value={filters.cowId} onValueChange={(value) => updateFilter('cowId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All cows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cows</SelectItem>
                  {cows?.map((cow) => (
                    <SelectItem key={cow.id} value={cow.id}>
                      {cow.cow_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">AI Status</Label>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pdStatus">PD Status</Label>
              <Select value={filters.pdStatus} onValueChange={(value) => updateFilter('pdStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All PD status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All PD Status</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="inconclusive">Inconclusive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
            <Button onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
