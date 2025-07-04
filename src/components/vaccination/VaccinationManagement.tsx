
import React from 'react';
import { VaccinationForm } from './VaccinationForm';
import { VaccinationTable } from './VaccinationTable';
import { useVaccination } from '@/hooks/useVaccination';

export const VaccinationManagement = () => {
  const { records, isLoading, addRecordMutation } = useVaccination();

  const handleAddRecord = (data: any) => {
    addRecordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vaccination Management</h1>
        <p className="text-muted-foreground">Manage vaccination schedules and records for your cattle.</p>
      </div>

      <VaccinationForm 
        onSubmit={handleAddRecord} 
        isLoading={addRecordMutation.isPending}
      />

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
