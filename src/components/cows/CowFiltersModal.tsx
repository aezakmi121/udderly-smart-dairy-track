import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { FilterModal } from '@/components/common/FilterModal';

interface CowFiltersModalProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  breedFilter: string;
  setBreedFilter: (breed: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
  breeds: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CowFiltersModal: React.FC<CowFiltersModalProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  breedFilter,
  setBreedFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters,
  breeds,
  open,
  onOpenChange
}) => {
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || breedFilter !== 'all' || sortBy !== 'cow_number' || sortOrder !== 'asc';

  return (
    <FilterModal
      title="Cow Filters & Sorting"
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
            placeholder="Search cows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="dry">Dry</SelectItem>
              <SelectItem value="pregnant">Pregnant</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="breed">Breed</Label>
          <Select value={breedFilter} onValueChange={setBreedFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All breeds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Breeds</SelectItem>
              {breeds.map((breed) => (
                <SelectItem key={breed} value={breed}>
                  {breed}
                </SelectItem>
              ))}
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
              <SelectItem value="cow_number">Cow Number</SelectItem>
              <SelectItem value="breed">Breed</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="date_of_arrival">Date of Arrival</SelectItem>
              <SelectItem value="lifetime_yield">Lifetime Yield</SelectItem>
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