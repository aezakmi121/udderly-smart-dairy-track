import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Plus, Trash2, Edit } from 'lucide-react';
import { MilkCollectionModal } from './MilkCollectionModal';
import { MilkCollectionTable } from './MilkCollectionTable';
import { MilkCollectionFilters } from './MilkCollectionFilters';
import { TodaysCollectionSummary } from './TodaysCollectionSummary';
import { BulkEditCollectionModal } from './BulkEditCollectionModal';
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
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkEditModalOpen, setBulkEditModalOpen] = React.useState(false);
  
  const { 
    collections, 
    dailyStats,
    isLoading, 
    addCollectionMutation, 
    updateCollectionMutation,
    deleteCollectionMutation,
    bulkDeleteMutation,
    bulkUpdateMutation
  } = useMilkCollection(filterMode === 'date' ? selectedDate : undefined);
  
  const { canEdit, isAdmin } = useUserPermissions();
  const toast = useToast();
  const { data: logsData } = useMilkingLog(selectedDate);
  
  // Determine if we can modify (lock past dates unless admin)
  const canModify = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return isAdmin || selectedDate === todayStr;
  }, [isAdmin, selectedDate]);

  const filteredCollections = React.useMemo(() => {
    if (!collections || isLoading) return [];
    let filtered = collections;
    if (filterMode === 'date') {
      filtered = collections.filter(c => c.collection_date === selectedDate && c.session === selectedSession);
    } else {
      if (dateRange.from) {
        filtered = filtered.filter(c => c.collection_date >= dateRange.from);
      }
      if (dateRange.to) {
        filtered = filtered.filter(c => c.collection_date <= dateRange.to);
      }
      filtered = filtered.filter(c => c.session === selectedSession);
    }
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
      toast({ title: 'Editing locked', description: "Only today'... unless an admin unlocks this date.", variant: 'destructive' });
      return;
    }
    if (editingCollection) {
      updateCollectionMutation.mutate(data);
    } else {
      addCollectionMutation.mutate(data);
    }
  };

  const handleEditCollection = (collection: any) => {
    if (!canModify) {
      toast({ title: 'Editing locked', description: "Only today'... unless an admin unlocks this date.", variant: 'destructive' });
      return;
    }
    setEditingCollection(collection);
    setModalOpen(true);
  };

  const handleDeleteCollection = (id: string) => {
    if (!canModify) {
      toast({ title: 'Editing locked', description: "Only today'... unless an admin unlocks this date.", variant: 'destructive' });
      return;
    }
    if (confirm('Are you sure you want to delete this collection record?')) {
      deleteCollectionMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (!canModify) {
      toast({ title: 'Editing locked', description: "Only today'... unless an admin unlocks this date.", variant: 'destructive' });
      return;
    }
    if (selectedIds.length > 0) {
      if (confirm(`Delete ${selectedIds.length} selected records?`)) {
        bulkDeleteMutation.mutate(selectedIds);
        setSelectedIds([]);
      }
    }
  };

  const handleBulkEdit = (data: { date: string; session: 'morning' | 'evening' }) => {
    if (!canModify) {
      toast({ title: 'Editing locked', description: "Only today'... unless an admin unlocks this date.", variant: 'destructive' });
      return;
    }
    if (selectedIds.length > 0) {
      bulkUpdateMutation.mutate({ ids: selectedIds, date: data.date, session: data.session });
      setSelectedIds([]);
      setBulkEditModalOpen(false);
    }
  };

  const handleDateChange = (val: string) => {
    setSelectedDate(val);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Milk Collection</h2>
          <p className="text-sm text-muted-foreground">
            {filterMode === 'date' ? `Date: ${formatDate(selectedDate)}` : 
             `Range: ${dateRange.from ? formatDate(dateRange.from) : '—'} → ${dateRange.to ? formatDate(dateRange.to) : '—'}`}
          </p>
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="filter-mode">View</Label>
            <div className="flex gap-2">
              <Button 
                type="button"
                variant={filterMode === 'date' ? 'default' : 'outline'}
                onClick={() => setFilterMode('date')}
                className="w-28"
              >
                Single Date
              </Button>
              <Button 
                type="button"
                variant={filterMode === 'range' ? 'default' : 'outline'}
                onClick={() => setFilterMode('range')}
                className="w-28"
              >
                Date Range
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="selectedDate">Date</Label>
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
          mode="cards-only"
        />
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {selectedIds.length} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkEditModalOpen(true)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Bulk Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <MilkCollectionFilters
        filterMode={filterMode}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Records Table */}
      <MilkCollectionTable
        collections={filteredCollections}
        isLoading={isLoading}
        canEdit={canModify}
        canDelete={canModify}
        onEdit={handleEditCollection}
        onDelete={handleDeleteCollection}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        selectedDate={selectedDate}
        selectedSession={selectedSession}
      />

      {/* Add / Edit Modal */}
      <MilkCollectionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAddCollection}
        isLoading={addCollectionMutation.isPending || updateCollectionMutation.isPending}
        initialData={editingCollection}
        session={selectedSession}
        date={selectedDate}
      />

      {/* Bulk Edit Modal */}
      <BulkEditCollectionModal
        open={bulkEditModalOpen}
        onOpenChange={setBulkEditModalOpen}
        onSubmit={handleBulkEdit}
        isLoading={bulkUpdateMutation.isPending}
        selectedCount={selectedIds.length}
      />
    </div>
  );
};
