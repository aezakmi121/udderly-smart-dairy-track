
import React from 'react';
import { VaccinationModal } from './VaccinationModal';
import { VaccinationTable } from './VaccinationTable';
import { useVaccination } from '@/hooks/useVaccination';

export const VaccinationManagement = () => {
  const { records, isLoading, addRecordMutation } = useVaccination();

  const handleAddRecord = (data: any) => {
    addRecordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaccination Management</h1>
          <p className="text-muted-foreground">Manage vaccination schedules and records for your cattle.</p>
        </div>
        <VaccinationModal 
          onSubmit={handleAddRecord} 
          isLoading={addRecordMutation.isPending}
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Vaccination Records</h2>
        </div>
        <div className="p-6">
          <VaccinationTable records={records || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
