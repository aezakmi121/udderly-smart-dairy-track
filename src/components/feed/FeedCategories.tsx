
import React from 'react';
import { CategoryModal } from './CategoryModal';
import { CategoryTable } from './CategoryTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedCategories = () => {
  const { categories, isLoading, createCategoryMutation } = useFeedManagement();

  const handleAddCategory = (data: any) => {
    createCategoryMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Feed Categories</h3>
        <CategoryModal 
          onSubmit={handleAddCategory} 
          isLoading={createCategoryMutation.isPending}
        />
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <CategoryTable categories={categories || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
