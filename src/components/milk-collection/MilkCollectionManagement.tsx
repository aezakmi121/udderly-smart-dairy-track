import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus } from 'lucide-react';
import { MilkCollectionModal } from './MilkCollectionModal';
import { MilkCollectionTable } from './MilkCollectionTable';
import { MilkCollectionFilters } from './MilkCollectionFilters';
import { TodaysCollectionSummary } from './TodaysCollectionSummary';
import { useMilkCollection } from '@/hooks/useMilkCollection';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { formatDate } from '@/lib/dateUtils';
import { useMilkingLog } from '@/hooks/useMilkingLogs';
import { useToast } from '@/hooks/use-toast';

export const MilkCollectionManagement = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = React.useState<'morning' | 'evening'>('morning');
  const [dateRange, setDateRange] = React.useState<{ from: string; to: string }>({ from: '', to: '' });
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCollection, setEditingCollection] = React.useState<any>(null);
  const [filterMode, setFilterMode] = React.useState<'date' | 'range'>('date');
  
  const { 
    collections, 
    dailyStats,
    isLoading, 
    addCollectionMutation, 
    updateCollectionMutation,
    deleteCollectionMutation 
  } = useMilkCollection(filterMode === 'date' ? selectedDate : undefined);
  
  const { canEdit, isAdmin } = useUserPermissions();
  const { log: milkingLog } = useMilkingLog(selectedDate, selectedSession);
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const isUnlocked = !!(milkingLog && !milkingLog.milking_start_time && !milkingLog.milking_end_time);
  const canModify = isAdmin || isToday || isUnlocked;

  // Filter collections by date range and session when in range mode
  const filteredCollections = React.useMemo(() => {
    let filtered = collections || [];
    
    if (filterMode === 'range' && (dateRange.from || dateRange.to)) {
      filtered = filtered.filter(collection => {
        const collectionDate = collection.collection_date;
        if (dateRange.from && collectionDate < dateRange.from) return false;
        if (dateRange.to && collectionDate > dateRange.to) return false;
        return true;
      });
    }
    
    // Apply session filter only for the table display, not for summary cards
    filtered = filtered.filter(collection => collection.session === selectedSession);
    
    return filtered;
  }, [collections, dateRange, filterMode, selectedSession]);

  // Close modal when mutations succeed
  React.useEffect(() => {
    if ((addCollectionMutation.isSuccess || updateCollectionMutation.isSuccess) && 
        !addCollectionMutation.isPending && !updateCollectionMutation.isPending) {
      setModalOpen(false);
      setEditingCollection(null);
    }
  }, [
    addCollectionMutation.isSuccess, 
    addCollectionMutation.isPending,
    updateCollectionMutation.isSuccess,
    updateCollectionMutation.isPending
  ]);

  const handleAddCollection = (data: any) => {
    if (!canModify) {
      toast({ title: 'Editing locked', description: "Only today's collections allowed unless an admin unlocks this date.", variant: 'destructive' });
      return;
    }
    if (editingCollection) {
      updateCollectionMutation.mutate(data);
    } else {
      addCollectionMutation.mutate(data);
    }
  };

  const handleEditCollection = (collection: any) => {
    setEditingCollection(collection);
    setModalOpen(true);
  };

  const handleDeleteCollection = (id: string) => {
    deleteCollectionMutation.mutate(id);
  };

  const handleDateRangeChange = (range: { from: string; to: string }) => {
    setDateRange(range);
    setFilterMode('range');
  };

  const handleClearFilters = () => {
    setDateRange({ from: '', to: '' });
    setFilterMode('date');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setFilterMode('date');
    setDateRange({ from: '', to: '' });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingCollection(null);
  };

  if (!canEdit.milkCollection) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-600">Access Restricted</h2>
          <p className="text-gray-500 mt-2">You don't have permission to access milk collection management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milk Collection</h1>
          <p className="text-muted-foreground">Record and manage milk collections from farmers.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <MilkCollectionFilters
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onClearFilters={handleClearFilters}
          />
          <Button className="w-full sm:w-auto" onClick={() => setModalOpen(true)} disabled={!canModify} title={!canModify ? 'Only today allowed unless unlocked by admin' : undefined}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Date and Session Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-4">
          <Label htmlFor="selectedDate">Select Date:</Label>
          <Input
            id="selectedDate"
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <Label htmlFor="session-selector">Session</Label>
          <div className="flex gap-2 mt-2">
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

      {/* Date-specific Summary */}
      {filterMode === 'date' && (
        <TodaysCollectionSummary 
          collections={collections || []}
          dailyStats={dailyStats}
          selectedDate={selectedDate}
          isLoading={isLoading}
          canEdit={canModify}
          canDelete={canModify}
          onEdit={handleEditCollection}
          onDelete={handleDeleteCollection}
        />
      )}

      {/* Collection Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filterMode === 'date' 
              ? `Collection Records - ${formatDate(selectedDate)}`
              : 'Filtered Collection Records'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MilkCollectionTable 
            collections={filteredCollections}
            isLoading={isLoading}
            canEdit={canModify}
            canDelete={canModify}
            onEdit={handleEditCollection}
            onDelete={handleDeleteCollection}
          />
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <MilkCollectionModal 
        onSubmit={handleAddCollection}
        isLoading={addCollectionMutation.isPending || updateCollectionMutation.isPending}
        open={modalOpen}
        onOpenChange={handleModalClose}
        initialData={editingCollection}
        title={editingCollection ? 'Edit Collection Record' : 'Add Collection Record'}
        selectedDate={selectedDate}
        selectedSession={selectedSession}
      />
    </div>
  );
};