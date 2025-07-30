import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { FilterModal } from '@/components/common/FilterModal';

interface MilkProductionFiltersModalProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sessionFilter: string;
  setSessionFilter: (session: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MilkProductionFiltersModal: React.FC<MilkProductionFiltersModalProps> = ({
  searchTerm,
  setSearchTerm,
  sessionFilter,
  setSessionFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  open,
  onOpenChange
}) => {
  const hasActiveFilters = searchTerm !== '' || sessionFilter !== 'all' || sortBy !== 'cow_number' || sortOrder !== 'asc';

  return (
    <FilterModal
      title="Milk Production Filters & Sorting"
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
          <Label htmlFor="session">Session</Label>
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="sort">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cow_number">Cow Number</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
              <SelectItem value="fat_percentage">Fat %</SelectItem>
              <SelectItem value="snf_percentage">SNF %</SelectItem>
              <SelectItem value="created_at">Date Added</SelectItem>
            </SelectContent>
          </Select>
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