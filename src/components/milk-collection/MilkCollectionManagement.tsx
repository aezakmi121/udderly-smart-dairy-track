
import React from 'react';
import { MilkCollectionForm } from './MilkCollectionForm';
import { MilkCollectionTable } from './MilkCollectionTable';
import { useMilkCollection } from '@/hooks/useMilkCollection';

export const MilkCollectionManagement = () => {
  const { collections, isLoading, addCollectionMutation } = useMilkCollection();

  const handleAddCollection = (data: any) => {
    addCollectionMutation.mutate(data);
  };

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

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Collection Records</h2>
        </div>
        <div className="p-6">
          <MilkCollectionTable collections={collections || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
