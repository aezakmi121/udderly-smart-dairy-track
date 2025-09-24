
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EnhancedMilkProductionModal } from './EnhancedMilkProductionModal';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMilkProduction } from '@/hooks/useMilkProduction';
import { MilkProductionForm } from './MilkProductionForm';
import { MilkStatsCards } from './MilkStatsCards';
import { MilkProductionTable } from './MilkProductionTable';
import { MilkProductionFiltersModal } from './MilkProductionFiltersModal';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useMilkingLog } from '@/hooks/useMilkingLogs';
import { useToast } from '@/hooks/use-toast';
import { useAppSetting } from '@/hooks/useAppSettings';
import { fromZonedTime } from 'date-fns-tz';
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

  const { log: milkingLog, isLoading: milkingLogLoading, startLog, endLog, setStartTime, setEndTime } = useMilkingLog(selectedDate, selectedSession);
  const { canEdit, isAdmin, isFarmWorker } = useUserPermissions();
  const { toast } = useToast();
  const { value: sessionSettings } = useAppSetting<any>('milking_session_settings');
  const tz = sessionSettings?.timezone || 'Asia/Kolkata';

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
  
  const todayStrTz = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const isToday = selectedDate === todayStrTz;
  const started = !!milkingLog?.milking_start_time;
  const ended = !!milkingLog?.milking_end_time;
  const sessionWindow = sessionSettings?.[selectedSession] ?? { start: '00:00', end: '23:59' };
  const startTs = fromZonedTime(`${selectedDate}T${sessionWindow.start}:00`, tz).getTime();
  const endTs = fromZonedTime(`${selectedDate}T${sessionWindow.end}:00`, tz).getTime();
  const withinWindow = Date.now() >= startTs && Date.now() <= endTs;
  // Admins can always modify, workers need session constraints
  const canModify = isAdmin ? true : isFarmWorker ? (!!milkingLog && !ended && (!sessionSettings?.enforceWindow || withinWindow)) : false;

  // Auto start/end based on settings and timezone
  useEffect(() => {
    if (!sessionSettings?.auto) return;
    const win = sessionWindow;
    const now = Date.now();
    const sStart = fromZonedTime(`${selectedDate}T${win.start}:00`, tz).getTime();
    const sEnd = fromZonedTime(`${selectedDate}T${win.end}:00`, tz).getTime();

    if (!milkingLog?.milking_start_time && now >= sStart) {
      setStartTime(selectedDate, selectedSession, win.start, tz);
    }
    if (!milkingLog?.milking_end_time && now >= sEnd) {
      setEndTime(selectedDate, selectedSession, win.end, tz);
    }
  }, [selectedDate, selectedSession, tz, sessionSettings?.auto, sessionSettings?.morning?.start, sessionSettings?.morning?.end, sessionSettings?.evening?.start, sessionSettings?.evening?.end, milkingLog?.milking_start_time, milkingLog?.milking_end_time]);

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
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Milk Production</h2>
          <p className="text-muted-foreground">Track daily milk production records</p>
          
          <div className="mt-4">
            <div className="w-full sm:w-40">
              <Label htmlFor="date-filter">Select Date</Label>
              <Input
                id="date-filter"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
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
            <EnhancedMilkProductionModal
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

      <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
        <span>
          Session: {selectedSession === 'morning' ? 'Morning' : 'Evening'} • {started
            ? `Started ${milkingLog?.milking_start_time ? new Date(milkingLog.milking_start_time).toLocaleTimeString() : ''}${ended ? ` • Ended ${milkingLog?.milking_end_time ? new Date(milkingLog.milking_end_time).toLocaleTimeString() : ''}` : ' • In progress'}`
            : (milkingLog && !ended ? 'Unlocked (no start time)' : 'Not started')}
        </span>
        {!started && (
          <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={async () => { await startLog(selectedDate, selectedSession); toast({ title: 'Session started' }); }}>
            Start Session
          </Button>
        )}
      </div>

      <MilkStatsCards dailyStats={dailyStats} />

      <Card>
        <CardHeader>
          <CardTitle>Production Records for {selectedDate}</CardTitle>
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
