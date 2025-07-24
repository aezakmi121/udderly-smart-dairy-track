
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';
import { VaccinationModal } from './VaccinationModal';
import { VaccinationTable } from './VaccinationTable';
import { VaccinationFilters } from './VaccinationFilters';
import { useVaccination } from '@/hooks/useVaccination';

export const VaccinationManagement = () => {
  const { records, isLoading, addRecordMutation } = useVaccination();
  const [modalOpen, setModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    cowId: 'all',
    vaccineId: 'all',
    administeredBy: ''
  });

  // Close modal when mutation succeeds
  React.useEffect(() => {
    if (addRecordMutation.isSuccess && !addRecordMutation.isPending) {
      setModalOpen(false);
    }
  }, [addRecordMutation.isSuccess, addRecordMutation.isPending]);

  // Filter records based on applied filters
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    
    return records.filter(record => {
      // Date filters
      if (filters.dateFrom && record.vaccination_date < filters.dateFrom) return false;
      if (filters.dateTo && record.vaccination_date > filters.dateTo) return false;
      
      // Cow filter
      if (filters.cowId && filters.cowId !== 'all' && record.cow_id !== filters.cowId) return false;
      
      // Vaccine filter
      if (filters.vaccineId && filters.vaccineId !== 'all' && record.vaccination_schedule_id !== filters.vaccineId) return false;
      
      // Administered by filter
      if (filters.administeredBy && !record.administered_by?.toLowerCase().includes(filters.administeredBy.toLowerCase())) return false;
      
      return true;
    });
  }, [records, filters]);

  const resetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      cowId: 'all',
      vaccineId: 'all',
      administeredBy: ''
    });
  };

  const handleAddRecord = (data: any) => {
    console.log('VaccinationManagement - submitting:', data);
    addRecordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vaccination Management</h1>
          <p className="text-muted-foreground">Manage vaccination schedules and records for your cattle.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <VaccinationModal 
            onSubmit={handleAddRecord} 
            isLoading={addRecordMutation.isPending}
            open={modalOpen}
            onOpenChange={setModalOpen}
          />
        </div>
      </div>

      {showFilters && (
        <VaccinationFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            Vaccination Records ({filteredRecords.length})
          </h2>
        </div>
        <div className="p-6">
          <VaccinationTable records={filteredRecords || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
