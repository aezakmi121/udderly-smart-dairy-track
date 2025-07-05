
import React from 'react';
import { MilkCollectionForm } from './MilkCollectionForm';
import { MilkCollectionTable } from './MilkCollectionTable';
import { TodaysCollectionSummary } from './TodaysCollectionSummary';
import { useMilkCollection } from '@/hooks/useMilkCollection';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export const MilkCollectionManagement = () => {
  const { collections, isLoading, addCollectionMutation, deleteCollectionMutation } = useMilkCollection();
  const { canAccess, canDelete } = useUserPermissions();

  const handleAddCollection = (data: any) => {
    addCollectionMutation.mutate(data);
  };

  const handleDeleteCollection = (id: string) => {
    deleteCollectionMutation.mutate(id);
  };

  if (!canAccess.milkCollection) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-600">Access Restricted</h2>
          <p className="text-gray-500 mt-2">You don't have permission to access milk collection management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Milk Collection</h1>
        <p className="text-muted-foreground">Record and manage milk collections from farmers.</p>
      </div>

      <MilkCollectionForm 
        onSubmit={handleAddCollection} 
        isLoading={addCollectionMutation.isPending}
      />

      <TodaysCollectionSummary collections={collections || []} isLoading={isLoading} />

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">All Collection Records</h2>
        </div>
        <div className="p-6">
          <MilkCollectionTable 
            collections={collections || []} 
            isLoading={isLoading}
            canDelete={canDelete.milkCollection}
            onDelete={handleDeleteCollection}
          />
        </div>
      </div>
    </div>
  );
};
