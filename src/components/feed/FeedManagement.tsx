
import React from 'react';
import { ManagementLayout, TabConfig } from '@/components/common/ManagementLayout';
import { FeedCategories } from './FeedCategories';
import { FeedItems } from './FeedItems';
import { FeedTransactions } from './FeedTransactions';
import { FeedStock } from './FeedStock';
import { EnhancedDailyFeedManagement } from './EnhancedDailyFeedManagement';

const tabs: TabConfig[] = [
  { id: 'stock', label: 'Stock Overview', component: FeedStock },
  { id: 'daily-feed', label: 'Daily Feed', component: EnhancedDailyFeedManagement },
  { id: 'transactions', label: 'Transactions', component: FeedTransactions },
  { id: 'items', label: 'Feed Items', component: FeedItems },
  { id: 'categories', label: 'Categories', component: FeedCategories }
];

export const FeedManagement = () => {
  return (
    <ManagementLayout
      title="Feed & Stock Management"
      description="Manage feed categories, items, and stock transactions."
      tabs={tabs}
      defaultTab="stock"
    />
  );
};
