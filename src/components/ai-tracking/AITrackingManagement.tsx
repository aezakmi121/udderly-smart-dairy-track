
import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AITrackingFormModal } from './AITrackingFormModal';
import { AITrackingTable } from './AITrackingTable';
import { AITrackingFiltersModal } from './AITrackingFiltersModal';
import { CowSummaryDashboard } from './CowSummaryDashboard';
import { useAITracking } from '@/hooks/useAITracking';
import type { ActionGroup } from '@/lib/breedingActions';

/** Which board headings each dashboard tile opens. */
const DASHBOARD_LINK_GROUPS: Record<string, ActionGroup[]> = {
  'pd-due': ['pd_due', 'pd_overdue'],
  'close-delivery': ['due_to_calve'],
  'overdue-delivery': ['overdue_delivery'],
  'needs-ai': ['not_pregnant', 'ready_to_serve'],
};

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

  const [searchParams] = useSearchParams();
  const presetFilter = searchParams.get('filter');

  const { aiRecords, isLoading, addAIRecordMutation, updateAIRecordMutation, deleteAIRecordMutation } = useAITracking();

  // Arriving from a dashboard tile opens the matching headings on the board.
  // Every tile used to land here unfiltered except pd-due, because the presets
  // were being forced through the All Records filter shape; the board's own
  // groups are what the tiles count, so they are what a tile should open.
  const expandGroups = useMemo(
    () => (presetFilter ? DASHBOARD_LINK_GROUPS[presetFilter] ?? [] : []),
    [presetFilter]
  );

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
    <div className="space-y-4">
      {/* No page heading: the nav already says where you are, and the board
          below is what you came for. */}
      <div className="flex justify-end gap-2">
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Cow Dashboard</TabsTrigger>
          <TabsTrigger value="all">All Records ({filteredRecords.length})</TabsTrigger>
        </TabsList>

        {/* The tab label is the heading. A second one inside the panel saying
            the same thing was just chrome to scroll past. */}
        <TabsContent value="dashboard" className="space-y-4">
          <CowSummaryDashboard expandGroups={expandGroups} />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="rounded-lg border bg-card p-3 sm:p-4">
            <div className="max-h-[70vh] overflow-auto overflow-x-auto">
              <AITrackingTable
                aiRecords={filteredRecords}
                isLoading={isLoading}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecord={handleDeleteRecord}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
