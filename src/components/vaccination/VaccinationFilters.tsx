import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import { useVaccinationCows } from '@/hooks/useCows';
import { useVaccination } from '@/hooks/useVaccination';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface VaccinationFiltersProps {
  filters: {
    dateFrom: string;
    dateTo: string;
    cowId: string;
    vaccineId: string;
    administeredBy: string;
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
}

export const VaccinationFilters: React.FC<VaccinationFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset
}) => {
  const { cows } = useVaccinationCows();
  const { schedules } = useVaccination();

  const updateFilter = (key: string, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const setQuickDateRange = (days: number) => {
    const today = new Date();
    const from = subDays(today, days);
    onFiltersChange({
      ...filters,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(today, 'yyyy-MM-dd')
    });
  };

  const setCurrentMonth = () => {
    const today = new Date();
    onFiltersChange({
      ...filters,
      dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
      dateTo: format(endOfMonth(today), 'yyyy-MM-dd')
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== 'all').length;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFiltersCount()} active
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="dateFrom">Date From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="dateTo">Date To</Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
            />
          </div>

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
            <Label htmlFor="vaccineId">Vaccine</Label>
            <Select value={filters.vaccineId} onValueChange={(value) => updateFilter('vaccineId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All vaccines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vaccines</SelectItem>
                {schedules?.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {schedule.vaccine_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
            <Calendar className="h-3 w-3 mr-1" />
            Last 7 days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
            <Calendar className="h-3 w-3 mr-1" />
            Last 30 days
          </Button>
          <Button variant="outline" size="sm" onClick={setCurrentMonth}>
            <Calendar className="h-3 w-3 mr-1" />
            This Month
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};