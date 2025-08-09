
import React, { useState } from 'react';
import { CategoryModal } from './CategoryModal';
import { CategoryTable } from './CategoryTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedCategories = () => {
  const { 
    categories, 
    isLoading, 
    createCategoryMutation, 
    updateCategoryMutation, 
    deleteCategoryMutation 
  } = useFeedManagement();
  
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleAddCategory = (data: any) => {
    createCategoryMutation.mutate(data);
  };

  const handleEditCategory = (data: any) => {
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data });
      setIsEditModalOpen(false);
      setSelectedCategory(null);
    }
  };

  const handleEdit = (category: any) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategoryMutation.mutate(id);
    }
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
          <CategoryTable 
            categories={categories || []} 
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Edit Modal - No trigger button needed */}
      <CategoryModal
        selectedCategory={selectedCategory}
        onSubmit={handleEditCategory}
        isLoading={updateCategoryMutation.isPending}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
};
