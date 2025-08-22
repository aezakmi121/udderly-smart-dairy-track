
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AITrackingFormModal } from './AITrackingFormModal';
import { AITrackingTable } from './AITrackingTable';
import { AITrackingFiltersModal } from './AITrackingFiltersModal';
import { LatestAIUpdates } from './LatestAIUpdates';
import { CowSummaryDashboard } from './CowSummaryDashboard';
import { useAITracking } from '@/hooks/useAITracking';

export const AITrackingManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    cowId: 'all',
    status: 'all',
    pdStatus: 'all'
  });
  
  const { aiRecords, isLoading, addAIRecordMutation, updateAIRecordMutation, deleteAIRecordMutation } = useAITracking();

  const filteredRecords = useMemo(() => {
    if (!aiRecords) return [];
    
    return aiRecords.filter(record => {
      // Date range filter
      if (filters.startDate && record.ai_date < filters.startDate) return false;
      if (filters.endDate && record.ai_date > filters.endDate) return false;
      
      // Cow filter
      if (filters.cowId && filters.cowId !== 'all' && record.cow_id !== filters.cowId) return false;
      
      // AI Status filter
      if (filters.status && filters.status !== 'all' && record.ai_status !== filters.status) return false;
      
      // PD Status filter
      if (filters.pdStatus && filters.pdStatus !== 'all') {
        if (filters.pdStatus === 'pending' && record.pd_done) return false;
        if (filters.pdStatus !== 'pending' && record.pd_result !== filters.pdStatus) return false;
      }
      
      return true;
    });
  }, [aiRecords, filters]);

  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      cowId: 'all',
      status: 'all',
      pdStatus: 'all'
    });
  };

  const handleAddRecord = (data: any) => {
    addAIRecordMutation.mutate(data);
  };

  const handleUpdateRecord = (id: string, updates: any) => {
    updateAIRecordMutation.mutate({ id, ...updates });
  };

  const handleDeleteRecord = (id: string) => {
    deleteAIRecordMutation.mutate(id);
  };
  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== 'all').length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Tracking</h1>
          <p className="text-muted-foreground">Track artificial insemination records and pregnancy detection.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFiltersModal(true)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add AI Record
          </Button>
        </div>
      </div>

      <AITrackingFiltersModal
        open={showFiltersModal}
        onOpenChange={setShowFiltersModal}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
      />

      <AITrackingFormModal
        open={showModal}
        onOpenChange={setShowModal}
        onSubmit={handleAddRecord}
        isLoading={addAIRecordMutation.isPending}
      />

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Cow Dashboard</TabsTrigger>
          <TabsTrigger value="latest">Latest AI Updates</TabsTrigger>
          <TabsTrigger value="all">All Records</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                Cow Summary Dashboard
              </h2>
              <p className="text-muted-foreground text-sm">
                One card per cow with delivery tracking and milking group management
              </p>
            </div>
            <div className="p-6">
              <CowSummaryDashboard />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="latest" className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                Latest AI Updates per Cow
              </h2>
              <p className="text-muted-foreground text-sm">
                Sorted by delivery due date, PD due date, and latest AI date
              </p>
            </div>
            <div className="p-6">
              <LatestAIUpdates 
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecord={handleDeleteRecord}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="space-y-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                AI Records ({filteredRecords.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="max-h-[70vh] overflow-auto overflow-x-auto">
                <AITrackingTable 
                  aiRecords={filteredRecords} 
                  isLoading={isLoading}
                  onUpdateRecord={handleUpdateRecord}
                  onDeleteRecord={handleDeleteRecord}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
