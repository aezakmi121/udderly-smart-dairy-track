
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useCalves } from '@/hooks/useCalves';
import { CalfForm } from './CalfForm';
import { CalvesTable } from './CalvesTable';
import { CalfDetailsModal } from './CalfDetailsModal';

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
  
  const {
    calves,
    isLoading,
    addCalfMutation,
    updateCalfMutation,
    deleteCalfMutation
  } = useCalves();

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calves Management</h2>
          <p className="text-muted-foreground">Track and manage your calves</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setSelectedCalf(null)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Calf
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCalf ? 'Edit Calf' : 'Add New Calf'}
              </DialogTitle>
            </DialogHeader>
            
            <CalfForm
              selectedCalf={selectedCalf}
              setSelectedCalf={setSelectedCalf}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={addCalfMutation.isPending || updateCalfMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calves Inventory</CardTitle>
          <CardDescription>
            {calves?.length || 0} calves registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalvesTable
            calves={calves || []}
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
