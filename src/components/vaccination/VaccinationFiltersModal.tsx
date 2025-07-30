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

interface VaccinationFiltersModalProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  vaccineFilter: string;
  setVaccineFilter: (vaccine: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  dateRange: { from?: Date; to?: Date };
  setDateRange: (range: { from?: Date; to?: Date }) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  vaccines: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const VaccinationFiltersModal: React.FC<VaccinationFiltersModalProps> = ({
  searchTerm,
  setSearchTerm,
  vaccineFilter,
  setVaccineFilter,
  statusFilter,
  setStatusFilter,
  dateRange,
  setDateRange,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  vaccines,
  open,
  onOpenChange
}) => {
  const hasActiveFilters = searchTerm !== '' || vaccineFilter !== 'all' || statusFilter !== 'all' || 
    !!dateRange.from || !!dateRange.to || sortBy !== 'vaccination_date' || sortOrder !== 'desc';

  return (
    <FilterModal
      title="Vaccination Filters & Sorting"
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
          <Label htmlFor="vaccine">Vaccine</Label>
          <Select value={vaccineFilter} onValueChange={setVaccineFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All vaccines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vaccines</SelectItem>
              {vaccines.map((vaccine) => (
                <SelectItem key={vaccine} value={vaccine}>
                  {vaccine}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="upcoming">Upcoming Due</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sort">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vaccination_date">Vaccination Date</SelectItem>
              <SelectItem value="next_due_date">Next Due Date</SelectItem>
              <SelectItem value="cow_number">Cow Number</SelectItem>
              <SelectItem value="vaccine_name">Vaccine Name</SelectItem>
            </SelectContent>
          </Select>
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