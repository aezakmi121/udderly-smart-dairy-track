import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Calendar } from 'lucide-react';

interface RateMatrixViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RateMatrixEntry {
  species: string;
  fat: number;
  snf: number;
  rate: number;
  effective_from: string;
}

export const RateMatrixViewer: React.FC<RateMatrixViewerProps> = ({
  open,
  onOpenChange
}) => {
  const [selectedSpecies, setSelectedSpecies] = useState<string>('Cow');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Get available effective dates
  const { data: effectiveDates } = useQuery({
    queryKey: ['rate-matrix-dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_matrix')
        .select('effective_from')
        .order('effective_from', { ascending: false });
      
      if (error) throw error;
      
      // Get unique dates
      const uniqueDates = [...new Set(data.map(item => item.effective_from))];
      return uniqueDates;
    },
    enabled: open
  });

  // Get rate matrix data
  const { data: rateMatrix, isLoading } = useQuery({
    queryKey: ['rate-matrix-viewer', selectedSpecies, selectedDate],
    queryFn: async () => {
      const query = supabase
        .from('rate_matrix')
        .select('*')
        .eq('species', selectedSpecies)
        .order('fat', { ascending: true })
        .order('snf', { ascending: true });

      if (selectedDate) {
        query.eq('effective_from', selectedDate);
      } else if (effectiveDates && effectiveDates.length > 0) {
        query.eq('effective_from', effectiveDates[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RateMatrixEntry[];
    },
    enabled: open && !!effectiveDates
  });

  // Process data into grid format
  const processedData = React.useMemo(() => {
    if (!rateMatrix) return { fatValues: [], snfValues: [], grid: {} };

    const fatValues = [...new Set(rateMatrix.map(item => item.fat))].sort((a, b) => a - b);
    const snfValues = [...new Set(rateMatrix.map(item => item.snf))].sort((a, b) => a - b);
    
    const grid: Record<string, Record<string, number>> = {};
    rateMatrix.forEach(item => {
      if (!grid[item.fat]) grid[item.fat] = {};
      grid[item.fat][item.snf] = item.rate;
    });

    return { fatValues, snfValues, grid };
  }, [rateMatrix]);

  React.useEffect(() => {
    if (effectiveDates && effectiveDates.length > 0 && !selectedDate) {
      setSelectedDate(effectiveDates[0]);
    }
  }, [effectiveDates, selectedDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Rate Matrix Viewer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Species</label>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cow">Cow</SelectItem>
                  <SelectItem value="Buffalo">Buffalo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Effective Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {effectiveDates?.map(date => (
                    <SelectItem key={date} value={date}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(date).toLocaleDateString()}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rate Matrix Grid */}
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <span className="ml-2">Loading rate matrix...</span>
                </div>
              </CardContent>
            </Card>
          ) : processedData.fatValues.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">{selectedSpecies}</Badge>
                  Rate Matrix
                  {selectedDate && (
                    <Badge variant="secondary">
                      Effective: {new Date(selectedDate).toLocaleDateString()}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Fat \ SNF</TableHead>
                        {processedData.snfValues.map(snf => (
                          <TableHead key={snf} className="text-center min-w-20">
                            {snf.toFixed(1)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.fatValues.map(fat => (
                        <TableRow key={fat}>
                          <TableCell className="font-medium bg-muted">
                            {fat.toFixed(1)}
                          </TableCell>
                          {processedData.snfValues.map(snf => (
                            <TableCell key={`${fat}-${snf}`} className="text-center">
                              {processedData.grid[fat]?.[snf] 
                                ? `₹${processedData.grid[fat][snf].toFixed(2)}`
                                : '-'
                              }
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  No rate data found for the selected criteria.
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};