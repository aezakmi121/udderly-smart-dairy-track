
import React from 'react';
import { WeightLogModal } from './WeightLogModal';
import { WeightLogTable } from './WeightLogTable';
import { useWeightLogs } from '@/hooks/useWeightLogs';

export const WeightLogsManagement = () => {
  const { weightLogs, isLoading, addWeightLogMutation } = useWeightLogs();
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleAddLog = (data: any) => {
    addWeightLogMutation.mutate(data, {
      onSuccess: () => {
        setModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weight Logs</h1>
          <p className="text-muted-foreground">Track cattle weight measurements and monitor growth.</p>
        </div>
        <WeightLogModal 
          onSubmit={handleAddLog} 
          isLoading={addWeightLogMutation.isPending}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      </div>

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
