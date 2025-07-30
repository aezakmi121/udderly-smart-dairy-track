import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FilterModal } from '@/components/common/FilterModal';

interface WeightLogFiltersModalProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  weightRange: { min: string; max: string };
  setWeightRange: (range: { min: string; max: string }) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const WeightLogFiltersModal: React.FC<WeightLogFiltersModalProps> = ({
  searchTerm,
  setSearchTerm,
  dateRange,
  setDateRange,
  weightRange,
  setWeightRange,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  open,
  onOpenChange
}) => {
  const hasActiveFilters = searchTerm !== '' || !!dateRange.from || !!dateRange.to || 
    weightRange.min !== '' || weightRange.max !== '' || sortBy !== 'log_date' || sortOrder !== 'desc';

  return (
    <FilterModal
      title="Weight Log Filters & Sorting"
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="search">Search by Cow Number</Label>
          <Input
            id="search"
            placeholder="Search by cow number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="sort">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="log_date">Log Date</SelectItem>
              <SelectItem value="cow_number">Cow Number</SelectItem>
              <SelectItem value="calculated_weight">Weight</SelectItem>
              <SelectItem value="heart_girth">Heart Girth</SelectItem>
              <SelectItem value="body_length">Body Length</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label>Weight Range (kg)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Min weight"
              type="number"
              value={weightRange.min}
              onChange={(e) => setWeightRange({ ...weightRange, min: e.target.value })}
            />
            <Input
              placeholder="Max weight"
              type="number"
              value={weightRange.max}
              onChange={(e) => setWeightRange({ ...weightRange, max: e.target.value })}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label>Date Range</Label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !dateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <Label htmlFor="sort-order">Sort Order</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2"
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>
    </FilterModal>
  );
};