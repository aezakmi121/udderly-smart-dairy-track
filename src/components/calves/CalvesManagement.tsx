
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalfModal } from './CalfModal';
import { Plus } from 'lucide-react';
import { useCalves } from '@/hooks/useCalves';
import { CalfForm } from './CalfForm';
import { CalvesTable } from './CalvesTable';
import { CalfDetailsModal } from './CalfDetailsModal';
import { CalfFiltersModal } from './CalfFiltersModal';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface Calf {
  id: string;
  calf_number?: string;
  gender: 'male' | 'female';
  date_of_birth: string;
  mother_cow_id?: string;
  breed?: string;
  birth_weight?: number;
  status?: 'alive' | 'dead' | 'sold';
  image_url?: string;
  notes?: string;
}

export const CalvesManagement = () => {
  const [selectedCalf, setSelectedCalf] = useState<Calf | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCalfForDetails, setSelectedCalfForDetails] = useState<Calf | null>(null);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [breedFilter, setBreedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('calf_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
  const {
    calves,
    isLoading,
    addCalfMutation,
    updateCalfMutation,
    deleteCalfMutation
  } = useCalves();
  
  const { canEdit } = useUserPermissions();

  // Get unique breeds for filter
  const uniqueBreeds = useMemo(() => {
    if (!calves) return [];
    const breeds = new Set(calves.map(calf => calf.breed).filter(Boolean));
    return Array.from(breeds).sort();
  }, [calves]);

  // Filter and sort calves
  const filteredAndSortedCalves = useMemo(() => {
    if (!calves) return [];
    
    let filtered = calves.filter(calf => {
      const matchesSearch = calf.calf_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesGender = genderFilter === 'all' || calf.gender === genderFilter;
      const matchesStatus = statusFilter === 'all' || calf.status === statusFilter;
      const matchesBreed = breedFilter === 'all' || calf.breed === breedFilter;
      
      return matchesSearch && matchesGender && matchesStatus && matchesBreed;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'calf_number':
          aValue = a.calf_number || '';
          bValue = b.calf_number || '';
          break;
        case 'date_of_birth':
          aValue = a.date_of_birth || '';
          bValue = b.date_of_birth || '';
          break;
        case 'gender':
          aValue = a.gender || '';
          bValue = b.gender || '';
          break;
        case 'breed':
          aValue = a.breed || '';
          bValue = b.breed || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'birth_weight':
          aValue = Number(a.birth_weight) || 0;
          bValue = Number(b.birth_weight) || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Special handling for calf_number which might be numeric
        if (sortBy === 'calf_number') {
          const numA = parseFloat(aValue);
          const numB = parseFloat(bValue);
          
          // If both can be parsed as numbers, sort numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortOrder === 'asc' ? numA - numB : numB - numA;
          }
        }
        
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [calves, searchTerm, genderFilter, statusFilter, breedFilter, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setGenderFilter('all');
    setStatusFilter('all');
    setBreedFilter('all');
    setSortBy('calf_number');
    setSortOrder('asc');
  };

  const handleSubmit = (calfData: any) => {
    if (selectedCalf) {
      updateCalfMutation.mutate({ id: selectedCalf.id, ...calfData });
    } else {
      addCalfMutation.mutate(calfData);
    }
    setIsDialogOpen(false);
    setSelectedCalf(null);
  };

  const handleEdit = (calf: any) => {
    setSelectedCalf(calf);
    setIsDialogOpen(true);
  };

  const handleView = (calf: any) => {
    setSelectedCalfForDetails(calf);
    setDetailsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteCalfMutation.mutate(id);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setSelectedCalf(null);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading calves...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Calves Management</h2>
          <p className="text-muted-foreground">Track and manage your calves</p>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row">
          <CalfFiltersModal
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            breedFilter={breedFilter}
            setBreedFilter={setBreedFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onClearFilters={handleClearFilters}
            breeds={uniqueBreeds}
            open={filterModalOpen}
            onOpenChange={setFilterModalOpen}
          />
          
          {canEdit.calves && (
            <CalfModal
              selectedCalf={selectedCalf}
              onSubmit={handleSubmit}
              isLoading={addCalfMutation.isPending || updateCalfMutation.isPending}
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              setSelectedCalf={setSelectedCalf}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Calves Details</CardTitle>
          <CardDescription>
            {filteredAndSortedCalves.length} of {calves?.length || 0} calves shown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalvesTable
            calves={filteredAndSortedCalves || []}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <CalfDetailsModal
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        calf={selectedCalfForDetails}
      />
    </div>
  );
};
