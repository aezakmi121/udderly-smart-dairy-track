import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useCollectionCenterDistributions } from '@/hooks/useCollectionCenterDistributions';
import CollectionCenterDistributionForm from './CollectionCenterDistributionForm';
import CollectionCenterDistributionTable from './CollectionCenterDistributionTable';

export const CollectionCenterDistributionManagement = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDistribution, setSelectedDistribution] = useState<any>(null);

  const {
    distributions,
    collectionData,
    isLoading,
    addDistributionMutation,
    updateDistributionMutation,
    deleteDistributionMutation
  } = useCollectionCenterDistributions(selectedDate);

  const handleAdd = (data: any) => {
    addDistributionMutation.mutate(
      { ...data, distribution_date: selectedDate },
      {
        onSuccess: () => {
          setIsAddModalOpen(false);
        }
      }
    );
  };

  const handleEdit = (distribution: any) => {
    setSelectedDistribution(distribution);
    setIsEditModalOpen(true);
  };

  const handleUpdate = (data: any) => {
    if (selectedDistribution) {
      updateDistributionMutation.mutate(
        { id: selectedDistribution.id, ...data },
        {
          onSuccess: () => {
            setIsEditModalOpen(false);
            setSelectedDistribution(null);
          }
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this distribution?')) {
      deleteDistributionMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Collection Center Distribution</h1>
          <p className="text-muted-foreground">Manage milk distribution from collection center</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      {collectionData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Morning Session</h3>
            <div className="space-y-1 text-sm">
              <p>Cow: {collectionData.morning.cow.toFixed(2)} L</p>
              <p>Buffalo: {collectionData.morning.buffalo.toFixed(2)} L</p>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Evening Session</h3>
            <div className="space-y-1 text-sm">
              <p>Cow: {collectionData.evening.cow.toFixed(2)} L</p>
              <p>Buffalo: {collectionData.evening.buffalo.toFixed(2)} L</p>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Distribution
        </Button>
      </div>

      <CollectionCenterDistributionTable
        distributions={distributions || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Collection Center Distribution</DialogTitle>
            <DialogDescription>
              Record milk distribution from collection center
            </DialogDescription>
          </DialogHeader>
          <CollectionCenterDistributionForm
            onSubmit={handleAdd}
            isLoading={addDistributionMutation.isPending}
            collectionData={collectionData}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Collection Center Distribution</DialogTitle>
            <DialogDescription>
              Update distribution record
            </DialogDescription>
          </DialogHeader>
          <CollectionCenterDistributionForm
            onSubmit={handleUpdate}
            isLoading={updateDistributionMutation.isPending}
            initialData={selectedDistribution}
            collectionData={collectionData}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
