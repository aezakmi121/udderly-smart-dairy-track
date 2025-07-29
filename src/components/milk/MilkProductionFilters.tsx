import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search } from 'lucide-react';

interface MilkProductionFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sessionFilter: string;
  setSessionFilter: (session: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  onClearFilters: () => void;
}

export const MilkProductionFilters: React.FC<MilkProductionFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  sessionFilter,
  setSessionFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onClearFilters
}) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search">Search by Cow Number</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Enter cow number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="session">Filter by Session</Label>
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

          <div>
            <Label htmlFor="sort">Sort by</Label>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cow_number">Cow Number</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="fat_percentage">Fat %</SelectItem>
                  <SelectItem value="snf_percentage">SNF %</SelectItem>
                  <SelectItem value="created_at">Time Added</SelectItem>
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