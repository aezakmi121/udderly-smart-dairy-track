
import React from 'react';
import { FeedItemModal } from './FeedItemModal';
import { FeedItemTable } from './FeedItemTable';
import { useFeedManagement } from '@/hooks/useFeedManagement';

export const FeedItems = () => {
  const { feedItems, isLoading, createFeedItemMutation } = useFeedManagement();

  const handleAddFeedItem = (data: any) => {
    createFeedItemMutation.mutate(data);
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
          <FeedItemTable feedItems={feedItems || []} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};
