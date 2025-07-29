import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';

interface CalfFiltersProps {
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
}

export const CalfFilters: React.FC<CalfFiltersProps> = ({
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
  breeds
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="search">Search by Calf Number</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Enter calf number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="gender">Filter by Gender</Label>
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
            <Label htmlFor="status">Filter by Status</Label>
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
            <Label htmlFor="breed">Filter by Breed</Label>
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
            <Label htmlFor="sort">Sort by</Label>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calf_number">Calf Number</SelectItem>
                  <SelectItem value="date_of_birth">Birth Date</SelectItem>
                  <SelectItem value="gender">Gender</SelectItem>
                  <SelectItem value="breed">Breed</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="birth_weight">Birth Weight</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClearFilters} size="sm">
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};