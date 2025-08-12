
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MilkProductionModal } from './MilkProductionModal';
import { Plus } from 'lucide-react';
import { useMilkProduction } from '@/hooks/useMilkProduction';
import { MilkProductionForm } from './MilkProductionForm';
import { MilkStatsCards } from './MilkStatsCards';
import { MilkProductionTable } from './MilkProductionTable';
import { MilkProductionFiltersModal } from './MilkProductionFiltersModal';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useMilkingLog } from '@/hooks/useMilkingLogs';
import { useToast } from '@/hooks/use-toast';
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
  const [selectedSession, setSelectedSession] = useState<'morning' | 'evening'>('morning');

  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('cow_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const {
    milkRecords,
    dailyStats,
    isLoading,
    addRecordMutation,
    updateRecordMutation,
    deleteRecordMutation
  } = useMilkProduction(selectedDate);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const started = !!milkingLog?.milking_start_time;
  const ended = !!milkingLog?.milking_end_time;
  const canModify = isAdmin ? true : isFarmWorker ? (isToday && started && !ended) : false;

  // Filter and sort milk records
  const filteredAndSortedRecords = useMemo(() => {
    if (!milkRecords) return [];
    
    let filtered = milkRecords.filter(record => {
      const cowNumber = record.cows?.cow_number || '';
      const matchesSearch = cowNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSession = sessionFilter === 'all' || record.session === sessionFilter;
      
      return matchesSearch && matchesSession;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'cow_number':
          aValue = a.cows?.cow_number || '';
          bValue = b.cows?.cow_number || '';
          break;
        case 'session':
          aValue = a.session || '';
          bValue = b.session || '';
          break;
        case 'quantity':
          aValue = Number(a.quantity) || 0;
          bValue = Number(b.quantity) || 0;
          break;
        case 'fat_percentage':
          aValue = Number(a.fat_percentage) || 0;
          bValue = Number(b.fat_percentage) || 0;
          break;
        case 'snf_percentage':
          aValue = Number(a.snf_percentage) || 0;
          bValue = Number(b.snf_percentage) || 0;
          break;
        case 'created_at':
          aValue = a.created_at || '';
          bValue = b.created_at || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Special handling for cow_number which might be numeric
        if (sortBy === 'cow_number') {
          const numA = parseFloat(aValue);
          const numB = parseFloat(bValue);
          
          // If both can be parsed as numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
          }
        }
        
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [milkRecords, searchTerm, sessionFilter, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSessionFilter('all');
    setSortBy('cow_number');
    setSortOrder('asc');
  };

  const handleSubmit = (recordData: any) => {
    if (!canModify) {
      toast({ title: 'Session locked', description: 'Start today\'s session to add records, and end it when done.', variant: 'destructive' });
      return;
    }
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
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Milk Production</h2>
          <p className="text-muted-foreground">Track daily milk production records</p>
          
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date-filter">Select Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-40"
              />
            </div>
            <div>
              <Label htmlFor="session-selector">Session</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedSession === 'morning' ? 'default' : 'outline'}
                  onClick={() => setSelectedSession('morning')}
                  className="w-28"
                >
                  Morning
                </Button>
                <Button
                  type="button"
                  variant={selectedSession === 'evening' ? 'default' : 'outline'}
                  onClick={() => setSelectedSession('evening')}
                  className="w-28"
                >
                  Evening
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <MilkProductionFiltersModal
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sessionFilter={sessionFilter}
            setSessionFilter={setSessionFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onClearFilters={handleClearFilters}
            open={filterModalOpen}
            onOpenChange={setFilterModalOpen}
          />
          
          {canEdit.milkProduction && (
            <MilkProductionModal
              selectedRecord={selectedRecord}
              selectedDate={selectedDate}
              defaultSession={selectedSession}
              onSubmit={handleSubmit}
              isLoading={addRecordMutation.isPending || updateRecordMutation.isPending}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              onCancel={handleCancel}
              disabledAdd={!canModify}
            />
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span>
          Session: {selectedSession === 'morning' ? 'Morning' : 'Evening'} • {started ? `Started ${milkingLog?.milking_start_time ? new Date(milkingLog.milking_start_time).toLocaleTimeString() : ''}${ended ? ` • Ended ${milkingLog?.milking_end_time ? new Date(milkingLog.milking_end_time).toLocaleTimeString() : ''}` : ' • In progress'}` : 'Not started'}
        </span>
        {!started && (
          <Button size="sm" variant="outline" onClick={async () => { await startLog(selectedDate, selectedSession); toast({ title: 'Session started' }); }}>
            Start Session
          </Button>
        )}
        {started && !ended && (
          <Button size="sm" variant="outline" onClick={async () => { await endLog(selectedDate, selectedSession); toast({ title: 'Session ended' }); }}>
            End Session
          </Button>
        )}
      </div>

      <MilkStatsCards dailyStats={dailyStats} />

      <Card>
        <CardHeader>
          <CardTitle>Production Records for {selectedDate} — {selectedSession === 'morning' ? 'Morning' : 'Evening'}</CardTitle>
          <CardDescription>
            {filteredAndSortedRecords.length} of {milkRecords?.length || 0} records shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MilkProductionTable
            milkRecords={filteredAndSortedRecords || []}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canEdit={canModify}
            canDelete={canModify}
          />
        </CardContent>
      </Card>
    </div>
  );
};
