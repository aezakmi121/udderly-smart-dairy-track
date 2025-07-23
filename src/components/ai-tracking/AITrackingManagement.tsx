
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AITrackingFormModal } from './AITrackingFormModal';
import { AITrackingTable } from './AITrackingTable';
import { AITrackingFilters } from './AITrackingFilters';
import { useAITracking } from '@/hooks/useAITracking';

export const AITrackingManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    cowId: '',
    status: '',
    pdStatus: ''
  });
  
  const { aiRecords, isLoading, addAIRecordMutation, updateAIRecordMutation } = useAITracking();

  const filteredRecords = useMemo(() => {
    if (!aiRecords) return [];
    
    return aiRecords.filter(record => {
      // Date range filter
      if (filters.startDate && record.ai_date < filters.startDate) return false;
      if (filters.endDate && record.ai_date > filters.endDate) return false;
      
      // Cow filter
      if (filters.cowId && record.cow_id !== filters.cowId) return false;
      
      // AI Status filter
      if (filters.status && record.ai_status !== filters.status) return false;
      
      // PD Status filter
      if (filters.pdStatus) {
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
      cowId: '',
      status: '',
      pdStatus: ''
    });
  };

  const handleAddRecord = (data: any) => {
    addAIRecordMutation.mutate(data);
  };

  const handleUpdateRecord = (id: string, updates: any) => {
    updateAIRecordMutation.mutate({ id, ...updates });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Tracking</h1>
          <p className="text-muted-foreground">Track artificial insemination records and pregnancy detection.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add AI Record
        </Button>
      </div>

      <AITrackingFilters
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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">AI Records</h2>
        </div>
        <div className="p-6">
          <AITrackingTable 
            aiRecords={filteredRecords} 
            isLoading={isLoading}
            onUpdateRecord={handleUpdateRecord}
          />
        </div>
      </div>
    </div>
  );
};
