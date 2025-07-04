
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedCategories } from './FeedCategories';
import { FeedItems } from './FeedItems';
import { FeedTransactions } from './FeedTransactions';
import { FeedStock } from './FeedStock';

export const FeedManagement = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feed & Stock Management</h1>
        <p className="text-muted-foreground">Manage feed categories, items, and stock transactions.</p>
      </div>

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stock">Stock Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="items">Feed Items</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stock">
          <FeedStock />
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
