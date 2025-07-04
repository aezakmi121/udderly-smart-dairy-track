
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useMilkProduction } from '@/hooks/useMilkProduction';
import { MilkProductionForm } from './MilkProductionForm';
import { MilkStatsCards } from './MilkStatsCards';
import { MilkProductionTable } from './MilkProductionTable';

interface MilkProduction {
  id: string;
  cow_id?: string;
  production_date: string;
  session: 'morning' | 'evening';
  quantity: number;
  fat_percentage?: number;
  snf_percentage?: number;
  remarks?: string;
}

export const MilkProduction = () => {
  const [selectedRecord, setSelectedRecord] = useState<MilkProduction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    milkRecords,
    dailyStats,
    isLoading,
    addRecordMutation,
    updateRecordMutation,
    deleteRecordMutation
  } = useMilkProduction(selectedDate);

  const handleSubmit = (recordData: any) => {
    if (selectedRecord) {
      updateRecordMutation.mutate({ id: selectedRecord.id, ...recordData });
    } else {
      addRecordMutation.mutate(recordData);
    }
    setIsDialogOpen(false);
    setSelectedRecord(null);
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteRecordMutation.mutate(id);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedRecord(null);
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
              
              <MilkProductionForm
                selectedRecord={selectedRecord}
                selectedDate={selectedDate}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isLoading={addRecordMutation.isPending || updateRecordMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <MilkStatsCards dailyStats={dailyStats} />

      <Card>
        <CardHeader>
          <CardTitle>Production Records for {selectedDate}</CardTitle>
          <CardDescription>
            {milkRecords?.length || 0} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MilkProductionTable
            milkRecords={milkRecords || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </div>
  );
};
