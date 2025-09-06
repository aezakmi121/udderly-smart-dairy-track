import React, { useState, useMemo } from 'react';
import { VaccinationModal } from './VaccinationModal';
import { VaccinationTable } from './VaccinationTable';
import { VaccinationFiltersModal } from './VaccinationFiltersModal';
import { useVaccination } from '@/hooks/useVaccination';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export const VaccinationManagement = () => {
  const { records, schedules, isLoading, addRecordMutation } = useVaccination();
  const { canEdit } = useUserPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [vaccineFilter, setVaccineFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [sortBy, setSortBy] = useState('vaccination_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Close modal when mutation succeeds
  React.useEffect(() => {
    if (addRecordMutation.isSuccess && !addRecordMutation.isPending) {
      setModalOpen(false);
    }
  }, [addRecordMutation.isSuccess, addRecordMutation.isPending]);

  // Get unique vaccines for filter
  const uniqueVaccines = useMemo(() => {
    if (!schedules) return [];
    return schedules.map(schedule => schedule.vaccine_name).filter(Boolean).sort();
  }, [schedules]);

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    if (!records) return [];
    
    let filtered = records.filter(record => {
      // Search filter
      const cowNumber = record.cows?.cow_number || '';
      const matchesSearch = cowNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Vaccine filter
      const matchesVaccine = vaccineFilter === 'all' || 
        record.vaccination_schedules?.vaccine_name === vaccineFilter;
      
      // Status filter based on next due date
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const today = new Date();
        const nextDue = new Date(record.next_due_date);
        
        if (statusFilter === 'upcoming') {
          matchesStatus = nextDue > today && nextDue <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else if (statusFilter === 'overdue') {
          matchesStatus = nextDue < today;
        } else if (statusFilter === 'completed') {
          matchesStatus = nextDue > new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      }
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRange.from || dateRange.to) {
        const recordDate = new Date(record.vaccination_date);
        if (dateRange.from && recordDate < dateRange.from) matchesDateRange = false;
        if (dateRange.to && recordDate > dateRange.to) matchesDateRange = false;
      }
      
      return matchesSearch && matchesVaccine && matchesStatus && matchesDateRange;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'vaccination_date':
          aValue = a.vaccination_date || '';
          bValue = b.vaccination_date || '';
          break;
        case 'next_due_date':
          aValue = a.next_due_date || '';
          bValue = b.next_due_date || '';
          break;
        case 'cow_number':
          aValue = a.cows?.cow_number || '';
          bValue = b.cows?.cow_number || '';
          break;
        case 'vaccine_name':
          aValue = a.vaccination_schedules?.vaccine_name || '';
          bValue = b.vaccination_schedules?.vaccine_name || '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

    return filtered;
  }, [records, searchTerm, vaccineFilter, statusFilter, dateRange, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setVaccineFilter('all');
    setStatusFilter('all');
    setDateRange({});
    setSortBy('vaccination_date');
    setSortOrder('desc');
  };

  const handleAddRecord = (data: any) => {
    
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
          <VaccinationFiltersModal
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            vaccineFilter={vaccineFilter}
            setVaccineFilter={setVaccineFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onClearFilters={handleClearFilters}
            vaccines={uniqueVaccines}
            open={filterModalOpen}
            onOpenChange={setFilterModalOpen}
          />
          
          {canEdit.vaccination && (
            <VaccinationModal 
              onSubmit={handleAddRecord} 
              isLoading={addRecordMutation.isPending}
              open={modalOpen}
              onOpenChange={setModalOpen}
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            Vaccination Records ({filteredAndSortedRecords.length} of {records?.length || 0} shown)
          </h2>
        </div>
        <div className="p-6">
          <VaccinationTable records={filteredAndSortedRecords || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};