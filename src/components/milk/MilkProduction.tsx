
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Milk } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MilkProduction {
  id: string;
  cow_id?: string;
  production_date: string;
  session: string;
  quantity: number;
  fat_percentage?: number;
  snf_percentage?: number;
  remarks?: string;
}

interface Cow {
  id: string;
  cow_number: string;
}

export const MilkProduction = () => {
  const [selectedRecord, setSelectedRecord] = useState<MilkProduction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: milkRecords, isLoading } = useQuery({
    queryKey: ['milk-production', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select(`
          *,
          cows!cow_id (
            cow_number
          )
        `)
        .eq('production_date', selectedDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: cows } = useQuery({
    queryKey: ['active-cows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cows')
        .select('id, cow_number')
        .eq('status', 'active')
        .order('cow_number');
      
      if (error) throw error;
      return data as Cow[];
    }
  });

  const { data: dailyStats } = useQuery({
    queryKey: ['daily-milk-stats', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milk_production')
        .select('quantity, session')
        .eq('production_date', selectedDate);
      
      if (error) throw error;
      
      const morning = data.filter(r => r.session === 'morning').reduce((sum, r) => sum + Number(r.quantity), 0);
      const evening = data.filter(r => r.session === 'evening').reduce((sum, r) => sum + Number(r.quantity), 0);
      
      return {
        morning,
        evening,
        total: morning + evening,
        records: data.length
      };
    }
  });

  const addRecordMutation = useMutation({
    mutationFn: async (newRecord: Omit<MilkProduction, 'id'>) => {
      const { data, error } = await supabase
        .from('milk_production')
        .insert([newRecord])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-production'] });
      queryClient.invalidateQueries({ queryKey: ['daily-milk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      setIsDialogOpen(false);
      setSelectedRecord(null);
      toast({ title: "Milk production record added successfully!" });
    }
  });

  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MilkProduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('milk_production')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-production'] });
      queryClient.invalidateQueries({ queryKey: ['daily-milk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      setIsDialogOpen(false);
      setSelectedRecord(null);
      toast({ title: "Record updated successfully!" });
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milk_production')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milk-production'] });
      queryClient.invalidateQueries({ queryKey: ['daily-milk-stats'] });
      queryClient.invalidateQueries({ queryKey: ['cows'] });
      toast({ title: "Record deleted successfully!" });
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const recordData = {
      cow_id: formData.get('cow_id') as string || null,
      production_date: formData.get('production_date') as string,
      session: formData.get('session') as string,
      quantity: parseFloat(formData.get('quantity') as string),
      fat_percentage: parseFloat(formData.get('fat_percentage') as string) || null,
      snf_percentage: parseFloat(formData.get('snf_percentage') as string) || null,
      remarks: formData.get('remarks') as string
    };

    if (selectedRecord) {
      updateRecordMutation.mutate({ id: selectedRecord.id, ...recordData });
    } else {
      addRecordMutation.mutate(recordData);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading milk production data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Milk Production</h2>
          <p className="text-muted-foreground">Track daily milk production records</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <Label htmlFor="date-filter">Select Date</Label>
            <Input
              id="date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => setSelectedRecord(null)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selectedRecord ? 'Edit Production Record' : 'Add Production Record'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="cow_id">Cow</Label>
                  <Select name="cow_id" defaultValue={selectedRecord?.cow_id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cow" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All cows (bulk entry)</SelectItem>
                      {cows?.map((cow) => (
                        <SelectItem key={cow.id} value={cow.id}>
                          {cow.cow_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="production_date">Date *</Label>
                    <Input
                      id="production_date"
                      name="production_date"
                      type="date"
                      defaultValue={selectedRecord?.production_date || selectedDate}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="session">Session *</Label>
                    <Select name="session" defaultValue={selectedRecord?.session || ''} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity (Liters) *</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.1"
                    defaultValue={selectedRecord?.quantity || ''}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fat_percentage">Fat % (optional)</Label>
                    <Input
                      id="fat_percentage"
                      name="fat_percentage"
                      type="number"
                      step="0.1"
                      defaultValue={selectedRecord?.fat_percentage || ''}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="snf_percentage">SNF % (optional)</Label>
                    <Input
                      id="snf_percentage"
                      name="snf_percentage"
                      type="number"
                      step="0.1"
                      defaultValue={selectedRecord?.snf_percentage || ''}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    name="remarks"
                    defaultValue={selectedRecord?.remarks || ''}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addRecordMutation.isPending || updateRecordMutation.isPending}>
                    {selectedRecord ? 'Update' : 'Add'} Record
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Daily Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Morning Milk</CardTitle>
            <Milk className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats?.morning?.toFixed(1) || '0.0'} L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evening Milk</CardTitle>
            <Milk className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats?.evening?.toFixed(1) || '0.0'} L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Daily</CardTitle>
            <Milk className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats?.total?.toFixed(1) || '0.0'} L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records</CardTitle>
            <Milk className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyStats?.records || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Production Records for {selectedDate}</CardTitle>
          <CardDescription>
            {milkRecords?.length || 0} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cow</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Fat %</TableHead>
                  <TableHead>SNF %</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milkRecords?.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.cows?.cow_number || 'Bulk Entry'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.session === 'morning' ? 'default' : 'secondary'}>
                        {record.session}
                      </Badge>
                    </TableCell>
                    <TableCell>{record.quantity} L</TableCell>
                    <TableCell>{record.fat_percentage ? `${record.fat_percentage}%` : 'N/A'}</TableCell>
                    <TableCell>{record.snf_percentage ? `${record.snf_percentage}%` : 'N/A'}</TableCell>
                    <TableCell>{record.remarks || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecord(record);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this record?')) {
                              deleteRecordMutation.mutate(record.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
