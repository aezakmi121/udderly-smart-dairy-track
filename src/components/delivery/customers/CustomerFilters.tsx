
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface CustomerFiltersProps {
  statusFilter: string;
  milkTypeFilter: string;
  onStatusFilterChange: (status: string) => void;
  onMilkTypeFilterChange: (type: string) => void;
  totalCount: number;
  filteredCount: number;
}

export const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  statusFilter,
  milkTypeFilter,
  onStatusFilterChange,
  onMilkTypeFilterChange,
  totalCount,
  filteredCount
}) => {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={milkTypeFilter} onValueChange={onMilkTypeFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by milk type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cow">Cow Milk</SelectItem>
            <SelectItem value="buffalo">Buffalo Milk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Badge variant="outline">
        Showing {filteredCount} of {totalCount} customers
      </Badge>
    </div>
  );
};
