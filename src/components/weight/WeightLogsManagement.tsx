
import React from 'react';
import { WeightLogForm } from './WeightLogForm';
import { WeightLogTable } from './WeightLogTable';
import { useWeightLogs } from '@/hooks/useWeightLogs';

export const WeightLogsManagement = () => {
  const { weightLogs, isLoading, addWeightLogMutation } = useWeightLogs();

  const handleAddLog = (data: any) => {
    addWeightLogMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weight Logs</h1>
        <p className="text-muted-foreground">Track cattle weight measurements and monitor growth.</p>
      </div>

      <WeightLogForm 
        onSubmit={handleAddLog} 
        isLoading={addWeightLogMutation.isPending}
      />

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Weight Records</h2>
        </div>
        <div className="p-6">
          <WeightLogTable weightLogs={weightLogs || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
