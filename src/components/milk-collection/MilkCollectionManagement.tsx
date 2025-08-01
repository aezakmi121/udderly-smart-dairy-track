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

export const MilkCollectionManagement = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
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

  // Filter collections by date range when in range mode
  const filteredCollections = React.useMemo(() => {
    if (filterMode === 'range' && (dateRange.from || dateRange.to)) {
      return collections?.filter(collection => {
        const collectionDate = collection.collection_date;
        if (dateRange.from && collectionDate < dateRange.from) return false;
        if (dateRange.to && collectionDate > dateRange.to) return false;
        return true;
      }) || [];
    }
    return collections || [];
  }, [collections, dateRange, filterMode]);

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

  if (!canEdit.milkProduction) {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milk Collection</h1>
          <p className="text-muted-foreground">Record and manage milk collections from farmers.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Collection Record
        </Button>
      </div>

      {/* Date Selection and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Collection Date & Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
              <Label htmlFor="selectedDate">Select Date</Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="flex gap-2">
              <MilkCollectionFilters
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date-specific Summary */}
      {filterMode === 'date' && (
        <TodaysCollectionSummary 
          collections={filteredCollections}
          dailyStats={dailyStats}
          selectedDate={selectedDate}
          isLoading={isLoading}
          canEdit={canEdit.milkProduction}
          canDelete={isAdmin}
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
            canEdit={canEdit.milkProduction}
            canDelete={isAdmin}
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
      />
    </div>
  );
};