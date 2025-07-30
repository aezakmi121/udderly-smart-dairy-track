import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { FilterModal } from '@/components/common/FilterModal';

interface CalfFiltersModalProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  genderFilter: string;
  setGenderFilter: (gender: string) => void;
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

export const CalfFiltersModal: React.FC<CalfFiltersModalProps> = ({
  searchTerm,
  setSearchTerm,
  genderFilter,
  setGenderFilter,
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
  const hasActiveFilters = searchTerm !== '' || genderFilter !== 'all' || statusFilter !== 'all' || breedFilter !== 'all' || sortBy !== 'calf_number' || sortOrder !== 'asc';

  return (
    <FilterModal
      title="Calf Filters & Sorting"
      onClearFilters={onClearFilters}
      hasActiveFilters={hasActiveFilters}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="search">Search by Calf Number</Label>
          <Input
            id="search"
            placeholder="Search calves..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
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
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="alive">Alive</SelectItem>
              <SelectItem value="dead">Dead</SelectItem>
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

        <div className="md:col-span-2">
          <Label htmlFor="sort">Sort By</Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calf_number">Calf Number</SelectItem>
              <SelectItem value="date_of_birth">Date of Birth</SelectItem>
              <SelectItem value="gender">Gender</SelectItem>
              <SelectItem value="breed">Breed</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="birth_weight">Birth Weight</SelectItem>
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