
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AITrackingForm } from './AITrackingForm';
import { AITrackingTable } from './AITrackingTable';
import { useAITracking } from '@/hooks/useAITracking';

export const AITrackingManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const { aiRecords, isLoading, addAIRecordMutation, updateAIRecordMutation } = useAITracking();

  const handleAddRecord = (data: any) => {
    addAIRecordMutation.mutate(data);
    setShowForm(false);
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
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? 'Hide Form' : 'Add AI Record'}
        </Button>
      </div>

      {showForm && (
        <AITrackingForm 
          onSubmit={handleAddRecord} 
          isLoading={addAIRecordMutation.isPending}
        />
      )}

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
