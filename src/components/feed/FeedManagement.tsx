
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedCategories } from './FeedCategories';
import { FeedItems } from './FeedItems';
import { FeedTransactions } from './FeedTransactions';
import { FeedStock } from './FeedStock';
import { DailyFeedManagement } from './DailyFeedManagement';

export const FeedManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Feed & Stock Management</h1>
        <p className="text-muted-foreground">Manage feed categories, items, and stock transactions.</p>
      </div>

      <Tabs defaultValue="stock" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full gap-1">
            <TabsTrigger value="stock" className="text-xs sm:text-sm">Stock Overview</TabsTrigger>
            <TabsTrigger value="daily-feed" className="text-xs sm:text-sm">Daily Feed</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
            <TabsTrigger value="items" className="text-xs sm:text-sm">Feed Items</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm">Categories</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="stock">
          <FeedStock />
        </TabsContent>
        
        <TabsContent value="daily-feed">
          <DailyFeedManagement />
        </TabsContent>
        
        <TabsContent value="transactions">
          <FeedTransactions />
        </TabsContent>
        
        <TabsContent value="items">
          <FeedItems />
        </TabsContent>
        
        <TabsContent value="categories">
          <FeedCategories />
        </TabsContent>
      </Tabs>
    </div>
  );
};
