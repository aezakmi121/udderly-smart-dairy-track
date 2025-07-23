
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AITrackingFormModal } from './AITrackingFormModal';
import { AITrackingTable } from './AITrackingTable';
import { useAITracking } from '@/hooks/useAITracking';

export const AITrackingManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const { aiRecords, isLoading, addAIRecordMutation, updateAIRecordMutation } = useAITracking();

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
            aiRecords={aiRecords || []} 
            isLoading={isLoading}
            onUpdateRecord={handleUpdateRecord}
          />
        </div>
      </div>
    </div>
  );
};
