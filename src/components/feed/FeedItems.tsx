
import React, { useState } from 'react';
import { FeedItemModal } from './FeedItemModal';
import { FeedItemTable } from './FeedItemTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedItems = () => {
  const { 
    feedItems, 
    isLoading, 
    createFeedItemMutation, 
    updateFeedItemMutation, 
    deleteFeedItemMutation 
  } = useFeedManagement();
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleAddFeedItem = (data: any) => {
    createFeedItemMutation.mutate(data);
  };

  const handleEditFeedItem = (data: any) => {
    if (selectedItem) {
      updateFeedItemMutation.mutate({ id: selectedItem.id, data });
      setIsEditModalOpen(false);
      setSelectedItem(null);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this feed item?')) {
      deleteFeedItemMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Feed Items</h3>
        <FeedItemModal 
          onSubmit={handleAddFeedItem} 
          isLoading={createFeedItemMutation.isPending}
        />
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <FeedItemTable 
            feedItems={feedItems || []} 
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Edit Modal */}
      <FeedItemModal
        selectedFeedItem={selectedItem}
        onSubmit={handleEditFeedItem}
        isLoading={updateFeedItemMutation.isPending}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
      />
    </div>
  );
};
