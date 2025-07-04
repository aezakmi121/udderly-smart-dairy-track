
import React from 'react';
import { CategoryForm } from './CategoryForm';
import { CategoryTable } from './CategoryTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedCategories = () => {
  const { categories, isLoading, addCategoryMutation } = useFeedManagement();

  const handleAddCategory = (data: any) => {
    addCategoryMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <CategoryForm 
        onSubmit={handleAddCategory} 
        isLoading={addCategoryMutation.isPending}
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Feed Categories</h3>
        </div>
        <div className="p-6">
          <CategoryTable categories={categories || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
