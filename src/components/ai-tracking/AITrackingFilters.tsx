import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { useCows } from '@/hooks/useCows';

interface AITrackingFiltersProps {
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

export const AITrackingFilters: React.FC<AITrackingFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset
}) => {
  const { cows } = useCows();

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="text-sm font-medium">Filters</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="cowSelect">Cow</Label>
            <Select value={filters.cowId} onValueChange={(value) => handleFilterChange('cowId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select cow" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50 max-h-60 overflow-y-auto">
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
            <Label htmlFor="statusSelect">AI Status</Label>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="pdStatusSelect">PD Status</Label>
            <Select value={filters.pdStatus} onValueChange={(value) => handleFilterChange('pdStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select PD status" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All PD Status</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="inconclusive">Inconclusive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};