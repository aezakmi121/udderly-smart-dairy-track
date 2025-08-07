
import React from 'react';
import { WeightLogModal } from './WeightLogModal';
import { WeightLogTable } from './WeightLogTable';
import { useWeightLogs } from '@/hooks/useWeightLogs';
import { WeightLogFiltersModal } from './WeightLogFiltersModal';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export const WeightLogsManagement = () => {
  const { weightLogs, isLoading, addWeightLogMutation } = useWeightLogs();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [filterModalOpen, setFilterModalOpen] = React.useState(false);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({});
  const [weightRange, setWeightRange] = React.useState({ min: '', max: '' });
  const [sortBy, setSortBy] = React.useState('log_date');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  
  const { canEdit } = useUserPermissions();

  // Close modal when mutation succeeds
  React.useEffect(() => {
    if (addWeightLogMutation.isSuccess && !addWeightLogMutation.isPending) {
      setModalOpen(false);
    }
  }, [addWeightLogMutation.isSuccess, addWeightLogMutation.isPending]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateRange({});
    setWeightRange({ min: '', max: '' });
    setSortBy('log_date');
    setSortOrder('desc');
  };

  const handleAddLog = (data: any) => {
    console.log('WeightLogsManagement - submitting:', data);
    addWeightLogMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Weight Logs</h1>
          <p className="text-muted-foreground">Track cattle weight measurements and monitor growth.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <WeightLogFiltersModal
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            dateRange={dateRange}
            setDateRange={setDateRange}
            weightRange={weightRange}
            setWeightRange={setWeightRange}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onClearFilters={handleClearFilters}
            open={filterModalOpen}
            onOpenChange={setFilterModalOpen}
          />
          
          {canEdit.weightLogs && (
            <WeightLogModal 
              onSubmit={handleAddLog} 
              isLoading={addWeightLogMutation.isPending}
              open={modalOpen}
              onOpenChange={setModalOpen}
            />
          )}
        </div>
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
