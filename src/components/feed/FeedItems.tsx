
import React from 'react';
import { FeedItemForm } from './FeedItemForm';
import { FeedItemTable } from './FeedItemTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedItems = () => {
  const { feedItems, isLoading, addFeedItemMutation } = useFeedManagement();

  const handleAddFeedItem = (data: any) => {
    addFeedItemMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <FeedItemForm 
        onSubmit={handleAddFeedItem} 
        isLoading={addFeedItemMutation.isPending}
      />
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Feed Items</h3>
        </div>
        <div className="p-6">
          <FeedItemTable feedItems={feedItems || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
